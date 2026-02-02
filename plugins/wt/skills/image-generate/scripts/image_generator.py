#!/usr/bin/env python3
"""
Common Image Generation Framework

This script provides a unified interface for generating images using multiple
backends. It abstracts the image generation process and supports:

- HuggingFace API (primary)
- Gemini API (fallback)

Requirements:
    - requests: uv add requests
    - PIL: uv add Pillow

Usage:
    python image_generator.py \
        --prompt "A beautiful landscape" \
        --backend huggingface \
        --output /path/to/image.png

Backend Selection:
    The script will try backends in order:
    1. huggingface (primary, requires API token)
    2. gemini (fallback, requires API key)

    Set default via --backend or HUGGINGFACE_API_TOKEN/GEMINI_API_TOKEN env vars.

Note: The nano_banana backend class exists for MCP tool integration but is not
available for direct CLI use. Use mcp__huggingface__gr1_z_image_turbo_generate
tool instead for Z-Image Turbo generation.
"""

import argparse
import os
import sys
import time
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Optional, Tuple, Dict, Any, List
from dataclasses import dataclass

# Add scripts directory to path for imports
script_dir = Path(__file__).parent
if str(script_dir) not in sys.path:
    sys.path.insert(0, str(script_dir))

try:
    import requests
    from PIL import Image
    import io
except ImportError as e:
    print(f"Error: Missing required dependency: {e}")
    print("Install with: uv add requests Pillow")
    sys.exit(1)

# Import template engine
try:
    from template_engine import (
        TemplateEngine,
        Template,
        TemplateConfig,
        TemplateError,
        TemplateNotFoundError,
        TemplateParseError,
        TemplateValidationError
    )
except ImportError as e:
    print(f"Error: Missing template_engine module: {e}")
    print("Ensure template_engine.py is in the same directory")
    sys.exit(1)

# Try to import WT config loader for centralized configuration
# This is optional - if not available, falls back to environment variables
_WT_CONFIG_LOADED = False
try:
    # Try parent directory (technical-content-creation/scripts)
    parent_script_dir = script_dir.parent
    if (parent_script_dir / "config_loader.py").exists():
        sys.path.insert(0, str(parent_script_dir))
        from config_loader import load_wt_config, get_wt_config
        _WT_CONFIG_LOADED = True
        # Load config and inject environment variables
        _wt_config = load_wt_config()
except ImportError:
    pass


# =============================================================================
# Common Interface and Data Structures
# =============================================================================

@dataclass
class GenerationRequest:
    """Unified image generation request."""
    prompt: str
    resolution: Tuple[int, int] = (1024, 1024)
    steps: int = 50
    timeout: int = 60
    model: Optional[str] = None


@dataclass
class GenerationResult:
    """Result of image generation."""
    success: bool
    image_bytes: Optional[bytes] = None
    output_path: Optional[str] = None
    method: str = ""
    error: Optional[str] = None
    size: Optional[Tuple[int, int]] = None
    metadata: Dict[str, Any] = None


class ImageGeneratorBackend(ABC):
    """Abstract base class for image generation backends."""

    @abstractmethod
    def get_name(self) -> str:
        """Return the name of this backend."""
        pass

    @abstractmethod
    def is_available(self) -> bool:
        """Check if this backend is available (has credentials, etc.)."""
        pass

    @abstractmethod
    def generate(self, request: GenerationRequest) -> GenerationResult:
        """Generate an image based on the request."""
        pass


# =============================================================================
# HuggingFace Implementation
# =============================================================================

class HuggingFaceBackend(ImageGeneratorBackend):
    """HuggingFace Inference API backend for image generation."""

    DEFAULT_MODEL = "stabilityai/stable-diffusion-xl-base-1.0"
    API_URL = "https://api-inference.huggingface.co/models/"

    def __init__(self, api_token: Optional[str] = None):
        self.api_token = api_token or os.environ.get("HUGGINGFACE_API_TOKEN")
        self.model = os.environ.get("HUGGINGFACE_MODEL", self.DEFAULT_MODEL)

    def get_name(self) -> str:
        return "huggingface"

    def is_available(self) -> bool:
        return bool(self.api_token)

    def generate(self, request: GenerationRequest) -> GenerationResult:
        """Generate image using HuggingFace API."""
        url = f"{self.API_URL}{self.model or self.DEFAULT_MODEL}"

        headers = {
            "Authorization": f"Bearer {self.api_token}",
            "Content-Type": "application/json",
        }

        payload = {
            "inputs": request.prompt,
            "parameters": {
                "width": request.resolution[0],
                "height": request.resolution[1],
                "num_inference_steps": request.steps,
            },
        }

        if request.model:
            # Use model override if specified
            url = f"{self.API_URL}{request.model}"

        try:
            response = requests.post(
                url,
                headers=headers,
                json=payload,
                timeout=request.timeout
            )

            if response.status_code == 200:
                return GenerationResult(
                    success=True,
                    image_bytes=response.content,
                    method="huggingface",
                    metadata={"model": self.model or self.DEFAULT_MODEL}
                )
            elif response.status_code == 503:
                # Model loading - should retry
                return GenerationResult(
                    success=False,
                    method="huggingface",
                    error=f"Model loading (HTTP 503): {response.text[:200]}"
                )
            else:
                return GenerationResult(
                    success=False,
                    method="huggingface",
                    error=f"HTTP {response.status_code}: {response.text[:200]}"
                )

        except requests.Timeout:
            return GenerationResult(
                success=False,
                method="huggingface",
                error=f"Timeout after {request.timeout}s"
            )
        except Exception as e:
            return GenerationResult(
                success=False,
                method="huggingface",
                error=f"Request error: {str(e)}"
            )


# =============================================================================
# Gemini Implementation
# =============================================================================

class GeminiBackend(ImageGeneratorBackend):
    """Gemini Imagen API backend for image generation."""

    DEFAULT_MODEL = "imagen-3.0-generate-001"

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.environ.get("GEMINI_API_KEY")
        self.model = os.environ.get("GEMINI_MODEL", self.DEFAULT_MODEL)
        self._client = None

    def get_name(self) -> str:
        return "gemini"

    def is_available(self) -> bool:
        """Check if google-genai package is available and API key is set."""
        if not self.api_key:
            return False
        try:
            from google import genai
            return True
        except ImportError:
            return False

    def _get_client(self):
        """Lazy initialize the GenAI client."""
        if self._client is None:
            try:
                from google import genai
                self._client = genai.Client(api_key=self.api_key)
            except ImportError:
                raise RuntimeError(
                    "google-genai package not found. Install with: uv add google-genai"
                )
        return self._client

    def _resolution_to_aspect_ratio(self, resolution: Tuple[int, int]) -> str:
        """Convert resolution to aspect ratio string."""
        width, height = resolution
        # Common aspect ratios supported by Imagen
        ratios = {
            (1024, 1024): "1:1",
            (1024, 768): "4:3",
            (768, 1024): "3:4",
            (1280, 720): "16:9",
            (720, 1280): "9:16",
            (1920, 1080): "16:9",
            (1080, 1920): "9:16",
        }
        return ratios.get((width, height), "1:1")

    def generate(self, request: GenerationRequest) -> GenerationResult:
        """Generate image using Gemini Imagen API."""
        try:
            from google.genai import types
            from google.genai import errors as genai_errors

            client = self._get_client()

            # Calculate aspect ratio from resolution
            aspect_ratio = self._resolution_to_aspect_ratio(request.resolution)

            # Configure image generation
            config = types.GenerateImagesConfig(
                aspect_ratio=aspect_ratio,
            )

            # Generate image
            response = client.models.generate_images(
                model=request.model or self.model,
                prompt=request.prompt,
                config=config,
                timeout=request.timeout
            )

            # Extract first generated image
            if response.generated_images and len(response.generated_images) > 0:
                generated_image = response.generated_images[0]

                # Get image bytes
                # The image object has a bytes property or we can save to BytesIO
                image_bytes = generated_image.image.image_bytes

                return GenerationResult(
                    success=True,
                    image_bytes=image_bytes,
                    method="gemini",
                    metadata={
                        "model": request.model or self.model,
                        "aspect_ratio": aspect_ratio
                    }
                )
            else:
                return GenerationResult(
                    success=False,
                    method="gemini",
                    error="No images generated in response"
                )

        except genai_errors.APIError as e:
            return GenerationResult(
                success=False,
                method="gemini",
                error=f"Gemini API error: {e.code} - {e.message}"
            )
        except ImportError:
            return GenerationResult(
                success=False,
                method="gemini",
                error="google-genai package not found. Install with: uv add google-genai"
            )
        except Exception as e:
            return GenerationResult(
                success=False,
                method="gemini",
                error=f"Gemini generation error: {str(e)}"
            )


# =============================================================================
# nano banana Implementation (Z-Image Turbo via HuggingFace MCP)
# =============================================================================

class NanoBananaBackend(ImageGeneratorBackend):
    """nano banana backend using HuggingFace Z-Image Turbo model via MCP.

    This backend uses the mcp__huggingface__gr1_z_image_turbo_generate tool
    which provides access to the Z-Image diffusion transformer pipeline.
    """

    # Z-Image Turbo resolution options
    RESOLUTION_MAP = {
        (1024, 1024): "1024x1024 ( 1:1 )",
        (1152, 896): "1152x896 ( 9:7 )",
        (896, 1152): "896x1152 ( 7:9 )",
        (1152, 864): "1152x864 ( 4:3 )",
        (864, 1152): "864x1152 ( 3:4 )",
        (1248, 832): "1248x832 ( 3:2 )",
        (832, 1248): "832x1248 ( 2:3 )",
        (1280, 720): "1280x720 ( 16:9 )",
        (720, 1280): "720x1280 ( 9:16 )",
        (1344, 576): "1344x576 ( 21:9 )",
        (576, 1344): "576x1344 ( 9:21 )",
        (1280, 1280): "1280x1280 ( 1:1 )",
        (1440, 1120): "1440x1120 ( 9:7 )",
        (1120, 1440): "1120x1440 ( 7:9 )",
        (1472, 1104): "1472x1104 ( 4:3 )",
        (1104, 1472): "1104x1472 ( 3:4 )",
        (1536, 1024): "1536x1024 ( 3:2 )",
        (1024, 1536): "1024x1536 ( 2:3 )",
        (1536, 864): "1536x864 ( 16:9 )",
        (864, 1536): "864x1536 ( 9:16 )",
        (1680, 720): "1680x720 ( 21:9 )",
        (720, 1680): "720x1680 ( 9:21 )",
        (1536, 1536): "1536x1536 ( 1:1 )",
        (1728, 1344): "1728x1344 ( 9:7 )",
        (1344, 1728): "1344x1728 ( 7:9 )",
        (1728, 1296): "1728x1296 ( 4:3 )",
        (1296, 1728): "1296x1728 ( 3:4 )",
        (1872, 1248): "1872x1248 ( 3:2 )",
        (1248, 1872): "1248x1872 ( 2:3 )",
        (2048, 1152): "2048x1152 ( 16:9 )",
        (1152, 2048): "1152x2048 ( 9:16 )",
        (2016, 864): "2016x864 ( 21:9 )",
        (864, 2016): "864x2016 ( 9:21 )",
    }

    def __init__(self):
        """Initialize nano banana backend."""
        # MCP tool availability is checked at runtime via Claude Code
        self._mcp_available = True

    def get_name(self) -> str:
        return "nano_banana"

    def is_available(self) -> bool:
        """Check if MCP tool is available.

        Note: This backend requires MCP tool invocation and is not
        available for direct use. Returns False to exclude from
        auto-selection. Users can still explicitly select it with
        --backend nano_banana if they understand the MCP requirement.
        """
        return False  # NanoBanana requires MCP tool invocation, not available for direct use

    def _find_closest_resolution(self, target_resolution: Tuple[int, int]) -> str:
        """Find the closest supported resolution for Z-Image Turbo.

        Z-Image Turbo supports specific resolutions. Find the closest match
        by aspect ratio and size.
        """
        target_width, target_height = target_resolution
        target_ratio = target_width / target_height

        # First try exact match
        if target_resolution in self.RESOLUTION_MAP:
            return self.RESOLUTION_MAP[target_resolution]

        # Find closest by aspect ratio
        best_match = None
        best_ratio_diff = float('inf')

        for (width, height), resolution_str in self.RESOLUTION_MAP.items():
            ratio = width / height
            ratio_diff = abs(ratio - target_ratio)

            if ratio_diff < best_ratio_diff:
                best_ratio_diff = ratio_diff
                best_match = resolution_str

        return best_match or self.RESOLUTION_MAP[(1024, 1024)]

    def generate(self, request: GenerationRequest) -> GenerationResult:
        """Generate image using Z-Image Turbo via MCP.

        Note: This backend requires calling from within Claude Code with
        MCP tools available. The actual MCP tool call is handled externally.
        This method returns instructions for the MCP tool invocation.
        """
        # This backend is designed to be called through the MCP tool interface
        # Return a special result indicating MCP invocation is needed
        resolution_str = self._find_closest_resolution(request.resolution)

        return GenerationResult(
            success=False,
            method="nano_banana",
            error=(
                "nano_banana backend requires MCP tool invocation. "
                "Use mcp__huggingface__gr1_z_image_turbo_generate with: "
                f"prompt='{request.prompt}', resolution='{resolution_str}', "
                f"steps={request.steps}, random_seed=true"
            )
        )

    @staticmethod
    def get_mcp_params(request: GenerationRequest) -> dict:
        """Get parameters for MCP tool invocation.

        Returns a dict suitable for mcp__huggingface__gr1_z_image_turbo_generate.

        Note: Explicitly sets seed as integer to avoid MCP tool default value
        being serialized as string during validation.
        """
        backend = NanoBananaBackend()
        resolution_str = backend._find_closest_resolution(request.resolution)

        return {
            "prompt": request.prompt,
            "resolution": resolution_str,
            "steps": max(1, min(request.steps, 20)),  # Z-Image Turbo: 1-20 steps
            "shift": 3,  # Default time shift
            "seed": 42,  # Explicit integer seed (overridden by random_seed=True)
            "random_seed": True,
        }


# =============================================================================
# Common Image Generation Framework
# =============================================================================

class ImageGenerator:
    """Main image generation framework that manages multiple backends."""

    # Backend priority order (first available is used)
    # Note: nano_banana requires MCP tool invocation and is only available when called from Claude Code
    BACKEND_PRIORITIES = ["huggingface", "gemini", "nano_banana"]

    def __init__(self, preferred_backend: Optional[str] = None):
        # Use config file default if no backend specified
        if preferred_backend is None and _WT_CONFIG_LOADED:
            try:
                preferred_backend = get_wt_config().get("image_generation", {}).get("backend")
            except Exception:
                pass

        self.preferred_backend = preferred_backend
        self.backends: Dict[str, ImageGeneratorBackend] = {}
        self._initialize_backends()

    def _initialize_backends(self):
        """Initialize all available backends."""
        # Initialize HuggingFace
        self.backends["huggingface"] = HuggingFaceBackend()

        # Initialize Gemini
        self.backends["gemini"] = GeminiBackend()

        # Initialize nano banana
        self.backends["nano_banana"] = NanoBananaBackend()

    def get_available_backends(self) -> list[str]:
        """Return list of backends that have credentials configured."""
        available = []
        for name in self.BACKEND_PRIORITIES:
            if name in self.backends and self.backends[name].is_available():
                available.append(name)
        return available

    def select_backend(self, backend_name: Optional[str] = None) -> ImageGeneratorBackend:
        """Select an appropriate backend for generation."""
        # If specific backend requested and available, use it
        if backend_name:
            if backend_name in self.backends:
                if self.backends[backend_name].is_available():
                    return self.backends[backend_name]
                else:
                    print(f"Warning: Requested backend '{backend_name}' is not available (missing credentials)")

        # Try preferred backend
        if self.preferred_backend:
            backend = self.backends.get(self.preferred_backend)
            if backend and backend.is_available():
                return backend

        # Try backends in priority order
        for name in self.BACKEND_PRIORITIES:
            backend = self.backends.get(name)
            if backend and backend.is_available():
                return backend

        # No backend available - provide helpful error message
        # List all backends that were checked and provide setup instructions
        checked_backends = list(self.BACKEND_PRIORITIES)
        raise RuntimeError(
            f"No image generation backend available. All checked backends are missing credentials.\n"
            f"Backends checked: {', '.join(checked_backends)}\n\n"
            f"To fix this, set one of the following environment variables:\n"
            f"  - HUGGINGFACE_API_TOKEN (for huggingface backend)\n"
            f"  - GEMINI_API_KEY (for gemini backend)\n\n"
            f"Note: nano_banana backend requires MCP tool invocation and is not available for direct use."
        )

    def generate(
        self,
        prompt: str,
        resolution: Tuple[int, int] = (1024, 1024),
        backend: Optional[str] = None,
        model: Optional[str] = None,
        steps: int = 50,
        timeout: int = 60,
        retries: int = 3,
        retry_delay: int = 2
    ) -> GenerationResult:
        """
        Generate an image using the specified or best available backend.

        Args:
            prompt: Text prompt for image generation
            resolution: Image resolution as (width, height)
            backend: Specific backend to use (or None for auto-selection)
            model: Model override for HuggingFace
            steps: Number of inference steps
            timeout: Request timeout in seconds
            retries: Number of retry attempts
            retry_delay: Delay between retries in seconds

        Returns:
            GenerationResult with success status and image data
        """
        request = GenerationRequest(
            prompt=prompt,
            resolution=resolution,
            steps=steps,
            timeout=timeout,
            model=model
        )

        selected_backend = self.select_backend(backend)
        backend_name = selected_backend.get_name()

        print(f"Using backend: {backend_name}")

        for attempt in range(retries):
            if attempt > 0:
                print(f"Retry {attempt + 1}/{retries}...")

            result = selected_backend.generate(request)

            if result.success:
                print(f"✓ Image generated successfully using {backend_name}")
                return result
            else:
                # Check if error is retryable (e.g., model loading)
                error_lower = result.error.lower() if result.error else ""
                if "loading" in error_lower or "timeout" in error_lower:
                    if attempt < retries - 1:
                        wait_time = retry_delay * (2 ** attempt)
                        print(f"  {result.error}")
                        print(f"  Waiting {wait_time}s before retry...")
                        time.sleep(wait_time)
                        continue

                # Non-retryable error or max retries exceeded
                print(f"✗ Generation failed: {result.error}")
                return result

        # Should not reach here, but handle gracefully
        return GenerationResult(
            success=False,
            method=backend_name,
            error="Max retries exceeded"
        )


# =============================================================================
# Utility Functions
# =============================================================================

def parse_resolution(resolution: str) -> Tuple[int, int]:
    """Parse resolution string (e.g., '1920x1080') into width and height."""
    try:
        width, height = resolution.lower().split("x")
        return int(width), int(height)
    except ValueError:
        raise argparse.ArgumentTypeError(
            f"Invalid resolution format: {resolution}. Expected format: WIDTHxHEIGHT (e.g., 1024x1024)"
        )


def save_image(image_bytes: bytes, output_path: str) -> Tuple[bool, Optional[Tuple[int, int]]]:
    """
    Save image bytes to file.

    Args:
        image_bytes: Image data
        output_path: Path to save image

    Returns:
        Tuple of (success, image_size)
    """
    try:
        output_file = Path(output_path)

        # Validate the output path for security
        _validate_output_path(output_file)

        output_file.parent.mkdir(parents=True, exist_ok=True)

        image = Image.open(io.BytesIO(image_bytes))
        image.save(output_path)

        print(f"✓ Image saved to: {output_path}")
        print(f"  Size: {image.size[0]}x{image.size[1]}")
        print(f"  Mode: {image.mode}")
        return True, image.size

    except ValueError as e:
        # Path validation error
        print(f"✗ Path validation error: {e}")
        return False, None
    except Exception as e:
        print(f"✗ Error saving image: {e}")
        return False, None


def _validate_output_path(output_path: Path) -> None:
    """
    Validate output path for security concerns.

    Args:
        output_path: Path to validate

    Raises:
        ValueError: If path fails validation
    """
    # Convert to absolute path to detect traversal attempts
    try:
        resolved_path = output_path.resolve()
    except Exception as e:
        raise ValueError(f"Invalid path: {e}")

    # Check for directory traversal attempts
    # Using str() to check for ".." components
    path_parts = output_path.parts
    if ".." in path_parts:
        raise ValueError(
            f"Path traversal detected: '{output_path}'. "
            f"Paths containing '..' are not allowed for security reasons."
        )

    # Validate file extension
    valid_extensions = {'.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.tiff'}
    suffix = output_path.suffix.lower()

    if not suffix:
        raise ValueError(
            f"Output path must have a file extension. "
            f"Valid extensions: {', '.join(sorted(valid_extensions))}"
        )

    if suffix not in valid_extensions:
        raise ValueError(
            f"Invalid file extension: '{suffix}'. "
            f"Valid image formats: {', '.join(sorted(valid_extensions))}"
        )

    # Check if path is abnormally long (potential buffer overflow attempt)
    if len(str(output_path)) > 1000:
        raise ValueError(
            f"Output path is too long ({len(str(output_path))} chars). "
            f"Maximum allowed: 1000 characters."
        )


def parse_variables(var_list: Optional[list]) -> Dict[str, str]:
    """
    Parse --var KEY=VALUE arguments into a dictionary.

    Args:
        var_list: List of "KEY=VALUE" strings

    Returns:
        Dictionary of variable names to values

    Raises:
        ValueError: If any argument is malformed
    """
    if not var_list:
        return {}

    variables = {}
    for var_arg in var_list:
        if "=" not in var_arg:
            raise ValueError(
                f"Invalid variable format: '{var_arg}'. Expected: KEY=VALUE"
            )

        key, value = var_arg.split("=", 1)
        key = key.strip()
        value = value.strip()

        if not key:
            raise ValueError(
                f"Invalid variable format: '{var_arg}'. Key cannot be empty."
            )

        variables[key] = value

    return variables


def load_content(content_input: Optional[str]) -> Optional[str]:
    """
    Load content from file path or use as-is.

    Args:
        content_input: File path or raw text content

    Returns:
        Content text, or None if input is None

    Raises:
        FileNotFoundError: If file path doesn't exist
    """
    if not content_input:
        return None

    # Check if it's a file path
    content_path = Path(content_input)
    if content_path.exists():
        try:
            return content_path.read_text(encoding="utf-8")
        except Exception as e:
            print(f"Error reading file: {e}")
            sys.exit(1)

    # Check if input looks like a file path but doesn't exist
    # Heuristics: contains path separators or has common file extensions
    looks_like_file = False
    path_separators = ['/', '\\']
    common_extensions = ['.md', '.txt', '.html', '.htm', '.json', '.yaml', '.yml', '.csv']

    if any(sep in content_input for sep in path_separators):
        looks_like_file = True
    else:
        for ext in common_extensions:
            if content_input.lower().endswith(ext):
                looks_like_file = True
                break

    if looks_like_file:
        print(f"Warning: Input '{content_input}' looks like a file path but file not found.")
        print(f"  Using as raw text content instead.")
        print(f"  If this was a typo, please check the filename.")
        print(f"  To pass raw text with spaces, quote it: '{content_input}'")
        print()

    # Use as-is (raw text content)
    return content_input


# =============================================================================
# Main Entry Point
# =============================================================================

def main():
    parser = argparse.ArgumentParser(
        description="Generate images using multiple backends (HuggingFace, Gemini, nano banana)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Auto-select best available backend
  python image_generator.py "A beautiful landscape" -o landscape.png

  # Use specific backend
  python image_generator.py "Architecture diagram" -o arch.png --backend huggingface

  # With custom resolution
  python image_generator.py "Flowchart" -o chart.png -r 1920x1080 --backend gemini

  # Use a template with variables
  python image_generator.py --template cover --var title="My Article" --var topics="AI" -o cover.png

  # Template with content from article
  python image_generator.py --template illustrator --content article.md -o diagram.png

  # Template with content and variables
  python image_generator.py --template cover --content article.md --var title="Custom Title" -o cover.png

  # Generate multiple images
  python image_generator.py --template cover --content article.md -n 3

Backends:
  huggingface  - HuggingFace Inference API (requires HUGGINGFACE_API_TOKEN)
  gemini      - Google Gemini Imagen (requires GEMINI_API_KEY)

Note: nano_banana backend is not available for direct CLI use.
Use mcp__huggingface__gr1_z_image_turbo_generate tool instead.

Templates:
  default      - General-purpose image generation (1024x1024, vibrant)
  cover        - Article cover image (1920x817, cinematic 2.35:1)
  illustrator  - Article illustration (800x600, technical-diagram)

Environment Variables:
  HUGGINGFACE_API_TOKEN - HuggingFace API token
  GEMINI_API_KEY         - Google Gemini API key
        """
    )

    parser.add_argument(
        "prompt",
        nargs="?",
        help="Text prompt for image generation (not required when using --template)"
    )
    parser.add_argument(
        "--output", "-o",
        help="Output image path (optional if template specifies output_filename)"
    )
    parser.add_argument(
        "--resolution", "-r",
        default=(get_wt_config().get("image_generation", {}).get("default_resolution", "1024x1024") if _WT_CONFIG_LOADED else "1024x1024"),
        help="Image resolution (default: from config or 1024x1024)"
    )
    parser.add_argument(
        "--backend", "-b",
        choices=ImageGenerator.BACKEND_PRIORITIES,
        help="Specific backend to use (default: auto-select first available)"
    )
    parser.add_argument(
        "--model", "-m",
        help="Override default model (for HuggingFace)"
    )
    parser.add_argument(
        "--steps", "-s",
        type=int,
        default=(get_wt_config().get("image_generation", {}).get("default_steps", 8) if _WT_CONFIG_LOADED else 8),
        help="Inference steps (default: from config or 8 for Z-Image Turbo)"
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=60,
        help="Request timeout in seconds (default: 60)"
    )
    parser.add_argument(
        "--retries",
        type=int,
        default=3,
        help="Number of retry attempts (default: 3)"
    )
    parser.add_argument(
        "--retry-delay",
        type=int,
        default=2,
        help="Delay between retries in seconds (default: 2)"
    )
    parser.add_argument(
        "--template", "-t",
        help="Use a template (e.g., 'default', 'cover', 'illustrator')"
    )
    parser.add_argument(
        "--var", "-v",
        action="append",
        metavar="KEY=VALUE",
        help="Template variable (can be used multiple times)"
    )
    parser.add_argument(
        "--content", "-c",
        metavar="FILE_OR_TEXT",
        help="Article content (file path or text) - sets {{content}} variable"
    )
    parser.add_argument(
        "--number", "-n",
        type=int,
        default=1,
        choices=range(1, 5),
        metavar="1-4",
        help="Number of images to generate (default: 1, max: 4)"
    )
    parser.add_argument(
        "--list-templates",
        action="store_true",
        help="List all available templates and exit"
    )

    args = parser.parse_args()

    # Handle --list-templates
    if args.list_templates:
        engine = TemplateEngine()
        templates = engine.list_templates()
        if templates:
            print("Available templates:")
            for template_name in templates:
                try:
                    template = engine.load_template(template_name)
                    print(f"\n  {template_name}:")
                    print(f"    Description: {template.config.description}")
                    print(f"    Resolution: {template.config.width}x{template.config.height}")
                    print(f"    Style: {template.config.style}")
                    if template.config.variables:
                        print(f"    Variables:")
                        for var_name, var_info in template.config.variables.items():
                            if isinstance(var_info, dict):
                                default = var_info.get("default", "")
                                desc = var_info.get("description", "")
                                print(f"      {var_name}: {desc} (default: '{default}')")
                            else:
                                print(f"      {var_name}: {var_info}")
                except Exception as e:
                    print(f"\n  {template_name}: Error loading - {e}")
        else:
            print("No templates found.")
        sys.exit(0)

    # Validate arguments when using --template
    if args.template:
        if not args.output:
            # Check if template specifies output_filename
            engine = TemplateEngine()
            try:
                template = engine.load_template(args.template)
                if template.config.output_filename:
                    # Render output filename with variables
                    vars_dict = parse_variables(args.var)
                    args.output = template.render_output_filename(vars_dict)
                else:
                    print(f"Error: Template '{args.template}' does not specify output_filename.")
                    print("Please provide --output argument.")
                    sys.exit(1)
            except TemplateNotFoundError as e:
                print(f"Error: {e}")
                sys.exit(1)
    else:
        # No template specified, prompt is required
        if not args.prompt:
            parser.error("prompt is required when not using --template")
        if not args.output:
            parser.error("--output is required when not using --template")

    # Parse resolution
    try:
        width, height = parse_resolution(args.resolution)
    except argparse.ArgumentTypeError as e:
        print(f"Error: {e}")
        sys.exit(1)

    # Initialize template engine if using template
    prompt = args.prompt
    resolution = (width, height)
    steps = args.steps
    backend = args.backend
    model = args.model

    if args.template:
        engine = TemplateEngine()
        try:
            # Load template
            template = engine.load_template(args.template)

            # Parse variables
            vars_dict = parse_variables(args.var)

            # Load content if provided
            if args.content:
                content = load_content(args.content)
                if content:
                    vars_dict["content"] = content
                    # Truncate content for display if too long
                    content_preview = content[:100] + "..." if len(content) > 100 else content
                    print(f"  Content: {content_preview}")

            # Render prompt
            prompt = template.render_prompt(vars_dict)

            # Use template config
            resolution = template.config.resolution
            if args.steps == 50:  # Only use template steps if not overridden
                steps = template.config.steps
            if not backend and template.config.backend:
                backend = template.config.backend
            if not model and template.config.model:
                model = template.config.model

            print(f"Using template: {args.template}")
            print(f"  Description: {template.config.description}")
            print(f"  Resolution: {template.config.width}x{template.config.height}")
            print(f"  Style: {template.config.style}")
            if vars_dict:
                print(f"  Variables: {', '.join(f'{k}={v[:50]}...' if len(str(v)) > 50 else f'{k}={v}' for k, v in vars_dict.items())}")
            print()

        except TemplateNotFoundError as e:
            print(f"Error: {e}")
            sys.exit(1)
        except TemplateParseError as e:
            print(f"Error parsing template: {e}")
            sys.exit(1)
        except TemplateValidationError as e:
            print(f"Error validating template: {e}")
            sys.exit(1)
        except TemplateError as e:
            print(f"Error loading template: {e}")
            sys.exit(1)

    # Initialize image generator framework
    generator = ImageGenerator(preferred_backend=backend)

    # Show available backends
    available = generator.get_available_backends()
    print(f"Available backends: {', '.join(available) if available else 'None (configure API tokens)'}")
    print()

    # Generate images (support multiple)
    num_images = args.number
    output_path = Path(args.output)
    method_used = None

    for i in range(num_images):
        # Adjust output filename for multiple images
        if num_images > 1:
            # Insert number before extension
            stem = output_path.stem
            suffix = output_path.suffix
            current_output = output_path.parent / f"{stem}-{i + 1}{suffix}"
        else:
            current_output = output_path

        print(f"Generating image {i + 1}/{num_images}...")

        # Generate image
        result = generator.generate(
            prompt=prompt,
            resolution=resolution,
            backend=backend,
            model=model,
            steps=steps,
            timeout=args.timeout,
            retries=args.retries,
            retry_delay=args.retry_delay
        )

        if not result.success:
            print(f"\n✗ Image generation failed: {result.error}")
            sys.exit(1)

        # Save image (verify image_bytes is not None, even in production)
        # This is an explicit check (not assert) to catch backend bugs even with python -O
        if result.image_bytes is None:
            print(f"\n✗ Internal error: Backend returned success=True but image_bytes is None")
            print(f"  This indicates a bug in the {result.method} backend implementation.")
            print(f"  Please report this issue with the backend details: {result.method}")
            sys.exit(1)

        success, _ = save_image(result.image_bytes, str(current_output))

        if not success:
            sys.exit(1)

        print(f"✓ Saved to: {current_output}")

        # Store method for final message
        if not method_used:
            method_used = result.method

    print(f"\n✓ Generated {num_images} image(s) using: {method_used}")


if __name__ == "__main__":
    main()
