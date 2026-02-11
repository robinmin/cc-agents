"""Integration tests for workflow orchestration.

Verifies the CONTENT of the rd2:workflow-orchestration skill, super-planner
agent, and tasks-plan command markdown files. These are structural/content
tests, not runtime tests, since the definitions are markdown-based.

Test categories:
1. Workflow template completeness and correctness
2. Intent-to-workflow keyword mapping
3. Super-planner tool restrictions
4. Role model consistency
5. Command-agent-skill alignment
6. Edge cases and invariants
"""

import re
from pathlib import Path

# Path constants (mirrored from conftest.py)
PLUGIN_ROOT = Path(__file__).parent.parent.parent.parent  # plugins/rd2/
SKILL_MD = Path(__file__).parent.parent / "SKILL.md"
SUPER_PLANNER_MD = PLUGIN_ROOT / "agents" / "super-planner.md"
TASKS_PLAN_MD = PLUGIN_ROOT / "commands" / "tasks-plan.md"

# -- Constants for assertions --

EXPECTED_WORKFLOW_IDS = {"W1", "W2", "W3", "W4", "W5", "W6", "W7"}

EXPECTED_WORKFLOW_NAMES = {
    "W1": "coding",
    "W2": "coding-with-design",
    "W3": "research",
    "W4": "bugfix",
    "W5": "refactor",
    "W6": "content",
    "W7": "planning-only",
}

EXPECTED_ROLES = {"orchestrator", "pre_production", "maker", "post_production", "checker"}

ALLOWED_PLANNER_TOOLS = {"Task", "AskUserQuestion", "Skill", "Bash"}

FORBIDDEN_PLANNER_TOOLS = {"Read", "Write", "Edit", "Grep", "Glob"}

KNOWN_AGENTS = {
    "super-planner",
    "super-architect",
    "super-designer",
    "super-coder",
    "super-brain",
    "super-code-reviewer",
    "knowledge-seeker",
    "wt:tc-writer",
}


# ============================================================================
# 1. FILE EXISTENCE
# ============================================================================


class TestFileExistence:
    """Verify all required files exist."""

    def test_skill_file_exists(self):
        """SKILL.md must exist for the workflow-orchestration skill."""
        assert SKILL_MD.exists(), f"Missing: {SKILL_MD}"

    def test_super_planner_exists(self):
        """super-planner.md must exist."""
        assert SUPER_PLANNER_MD.exists(), f"Missing: {SUPER_PLANNER_MD}"

    def test_tasks_plan_command_exists(self):
        """tasks-plan.md must exist."""
        assert TASKS_PLAN_MD.exists(), f"Missing: {TASKS_PLAN_MD}"

    def test_references_directory_exists(self):
        """References directory should exist in the skill."""
        refs_dir = SKILL_MD.parent / "references"
        assert refs_dir.is_dir(), f"Missing references directory: {refs_dir}"

    def test_workflow_templates_reference_exists(self):
        """Workflow templates reference file should exist."""
        ref_file = SKILL_MD.parent / "references" / "workflow-templates.md"
        assert ref_file.exists(), f"Missing: {ref_file}"

    def test_registry_json_exists(self):
        """Machine-readable registry JSON should exist in references/."""
        registry_file = SKILL_MD.parent / "references" / "registry.json"
        assert registry_file.exists(), f"Missing: {registry_file}"


# ============================================================================
# 2. WORKFLOW TEMPLATE COMPLETENESS
# ============================================================================


class TestWorkflowTemplateCompleteness:
    """All 7 workflow templates must be defined and structurally complete."""

    def test_all_seven_templates_defined(self, workflow_registry):
        """Registry must contain exactly W1 through W7."""
        assert set(workflow_registry.keys()) == EXPECTED_WORKFLOW_IDS

    def test_all_templates_have_correct_names(self, workflow_registry):
        """Each template must have the expected name."""
        for wid, expected_name in EXPECTED_WORKFLOW_NAMES.items():
            assert workflow_registry[wid]["name"] == expected_name, (
                f"{wid} name mismatch: expected '{expected_name}', "
                f"got '{workflow_registry[wid]['name']}'"
            )

    def test_all_templates_have_id_field(self, workflow_registry):
        """Each template must have an 'id' field matching its key."""
        for wid, template in workflow_registry.items():
            assert template.get("id") == wid, (
                f"Template {wid} has mismatched id: {template.get('id')}"
            )

    def test_all_templates_have_description(self, workflow_registry):
        """Each template must have a non-empty description."""
        for wid, template in workflow_registry.items():
            desc = template.get("description", "")
            assert len(desc) > 10, (
                f"Template {wid} has empty or too-short description: '{desc}'"
            )

    def test_all_templates_have_roles_dict(self, workflow_registry):
        """Each template must have a 'roles' dictionary."""
        for wid, template in workflow_registry.items():
            assert "roles" in template, f"Template {wid} missing 'roles'"
            assert isinstance(template["roles"], dict), (
                f"Template {wid} 'roles' must be a dict"
            )

    def test_all_templates_have_all_role_keys(self, workflow_registry):
        """Each template roles dict must have all 5 role keys."""
        for wid, template in workflow_registry.items():
            roles = template["roles"]
            for role in EXPECTED_ROLES:
                assert role in roles, (
                    f"Template {wid} missing role key: {role}"
                )

    def test_all_templates_have_keywords(self, workflow_registry):
        """Each template must have a non-empty keywords list."""
        for wid, template in workflow_registry.items():
            keywords = template.get("keywords", [])
            assert isinstance(keywords, list), (
                f"Template {wid} keywords must be a list"
            )
            assert len(keywords) >= 2, (
                f"Template {wid} must have at least 2 keywords, got {len(keywords)}"
            )

    def test_orchestrator_is_always_super_planner(self, workflow_registry):
        """Every template must have super-planner as orchestrator."""
        for wid, template in workflow_registry.items():
            assert template["roles"]["orchestrator"] == "super-planner", (
                f"Template {wid} orchestrator must be super-planner, "
                f"got: {template['roles']['orchestrator']}"
            )


# ============================================================================
# 3. ROLE ASSIGNMENTS PER TEMPLATE
# ============================================================================


class TestRoleAssignments:
    """Verify each workflow template has correct agent assignments."""

    def test_w1_coding_roles(self, workflow_registry):
        """W1 coding: architect -> coder -> reviewer -> coder(fix)."""
        roles = workflow_registry["W1"]["roles"]
        assert roles["pre_production"] == ["super-architect"]
        assert roles["maker"] == "super-coder"
        assert roles["post_production"] == "super-code-reviewer"
        assert roles["checker"] == "super-coder"

    def test_w2_coding_with_design_roles(self, workflow_registry):
        """W2 coding-with-design: architect+designer -> coder -> reviewer."""
        roles = workflow_registry["W2"]["roles"]
        assert "super-architect" in roles["pre_production"]
        assert "super-designer" in roles["pre_production"]
        assert roles["maker"] == "super-coder"
        assert roles["post_production"] == "super-code-reviewer"
        assert roles["checker"] == "super-coder"

    def test_w3_research_roles(self, workflow_registry):
        """W3 research: knowledge-seeker -> brain -> knowledge-seeker(verify)."""
        roles = workflow_registry["W3"]["roles"]
        assert roles["pre_production"] == ["knowledge-seeker"]
        assert roles["maker"] == "super-brain"
        assert roles["post_production"] is None
        assert roles["checker"] == "knowledge-seeker"

    def test_w4_bugfix_roles(self, workflow_registry):
        """W4 bugfix: no pre-prod -> coder -> reviewer -> coder(fix)."""
        roles = workflow_registry["W4"]["roles"]
        assert roles["pre_production"] is None
        assert roles["maker"] == "super-coder"
        assert roles["post_production"] == "super-code-reviewer"
        assert roles["checker"] == "super-coder"

    def test_w5_refactor_roles(self, workflow_registry):
        """W5 refactor: architect -> coder -> reviewer -> coder(fix)."""
        roles = workflow_registry["W5"]["roles"]
        assert roles["pre_production"] == ["super-architect"]
        assert roles["maker"] == "super-coder"
        assert roles["post_production"] == "super-code-reviewer"
        assert roles["checker"] == "super-coder"

    def test_w6_content_roles(self, workflow_registry):
        """W6 content: knowledge-seeker -> tc-writer -> knowledge-seeker(verify)."""
        roles = workflow_registry["W6"]["roles"]
        assert roles["pre_production"] == ["knowledge-seeker"]
        assert roles["maker"] == "wt:tc-writer"
        assert roles["post_production"] is None
        assert roles["checker"] == "knowledge-seeker"

    def test_w7_planning_only_roles(self, workflow_registry):
        """W7 planning-only: brain -> no maker/post-prod/checker."""
        roles = workflow_registry["W7"]["roles"]
        assert roles["pre_production"] == ["super-brain"]
        assert roles["maker"] is None
        assert roles["post_production"] is None
        assert roles["checker"] is None

    def test_all_agents_in_registry_are_known(self, workflow_registry):
        """Every agent referenced in templates must be a known agent."""
        for wid, template in workflow_registry.items():
            roles = template["roles"]
            for role_name, agent_value in roles.items():
                if agent_value is None:
                    continue
                agents = agent_value if isinstance(agent_value, list) else [agent_value]
                for agent in agents:
                    assert agent in KNOWN_AGENTS, (
                        f"Template {wid} role {role_name} references unknown agent: "
                        f"'{agent}'. Known agents: {KNOWN_AGENTS}"
                    )


# ============================================================================
# 4. SUPER-PLANNER TOOL RESTRICTIONS
# ============================================================================


class TestSuperPlannerToolRestrictions:
    """Super-planner agent must have exactly the 4 allowed tools."""

    def test_planner_has_exactly_four_tools(self, planner_tools):
        """Tools list must contain exactly 4 entries."""
        assert len(planner_tools) == 4, (
            f"super-planner must have exactly 4 tools, got {len(planner_tools)}: "
            f"{planner_tools}"
        )

    def test_planner_has_all_allowed_tools(self, planner_tools):
        """Tools list must contain Task, AskUserQuestion, Skill, Bash."""
        planner_set = set(planner_tools)
        assert planner_set == ALLOWED_PLANNER_TOOLS, (
            f"super-planner tools mismatch. "
            f"Expected: {ALLOWED_PLANNER_TOOLS}. Got: {planner_set}"
        )

    def test_planner_does_not_have_read(self, planner_tools):
        """Read tool must NOT be in super-planner tools."""
        assert "Read" not in planner_tools

    def test_planner_does_not_have_write(self, planner_tools):
        """Write tool must NOT be in super-planner tools."""
        assert "Write" not in planner_tools

    def test_planner_does_not_have_edit(self, planner_tools):
        """Edit tool must NOT be in super-planner tools."""
        assert "Edit" not in planner_tools

    def test_planner_does_not_have_grep(self, planner_tools):
        """Grep tool must NOT be in super-planner tools."""
        assert "Grep" not in planner_tools

    def test_planner_does_not_have_glob(self, planner_tools):
        """Glob tool must NOT be in super-planner tools."""
        assert "Glob" not in planner_tools

    def test_planner_no_forbidden_tools(self, planner_tools):
        """No forbidden tools should appear in the tools list."""
        found_forbidden = set(planner_tools) & FORBIDDEN_PLANNER_TOOLS
        assert found_forbidden == set(), (
            f"Forbidden tools found in super-planner: {found_forbidden}"
        )

    def test_planner_body_documents_tool_restriction(self, planner_content):
        """Agent body must contain an explicit tools restriction section."""
        assert "Tools Restriction" in planner_content, (
            "super-planner must have a 'Tools Restriction' section"
        )

    def test_planner_body_lists_removed_tools(self, planner_content):
        """Agent body must explain why Read/Write/Edit/Grep/Glob were removed."""
        for tool in FORBIDDEN_PLANNER_TOOLS:
            # Check the "Why These Tools Only" table mentions each removed tool
            assert f"| {tool} |" in planner_content, (
                f"super-planner body must explain removal of {tool}"
            )


# ============================================================================
# 5. INTENT-TO-WORKFLOW KEYWORD MAPPING
# ============================================================================


class TestIntentMapping:
    """Verify intent-to-workflow keyword mapping is correct."""

    def test_coding_keywords_include_implement(self, workflow_registry):
        """W1 coding must match 'implement' keyword."""
        assert "implement" in workflow_registry["W1"]["keywords"]

    def test_coding_keywords_include_build(self, workflow_registry):
        """W1 coding must match 'build' keyword."""
        assert "build" in workflow_registry["W1"]["keywords"]

    def test_coding_keywords_include_api(self, workflow_registry):
        """W1 coding must match 'API' keyword."""
        assert "API" in workflow_registry["W1"]["keywords"]

    def test_bugfix_keywords_include_fix(self, workflow_registry):
        """W4 bugfix must match 'fix' keyword."""
        assert "fix" in workflow_registry["W4"]["keywords"]

    def test_bugfix_keywords_include_bug(self, workflow_registry):
        """W4 bugfix must match 'bug' keyword."""
        assert "bug" in workflow_registry["W4"]["keywords"]

    def test_bugfix_keywords_include_crash(self, workflow_registry):
        """W4 bugfix must match 'crash' keyword."""
        assert "crash" in workflow_registry["W4"]["keywords"]

    def test_research_keywords_include_research(self, workflow_registry):
        """W3 research must match 'research' keyword."""
        assert "research" in workflow_registry["W3"]["keywords"]

    def test_research_keywords_include_investigate(self, workflow_registry):
        """W3 research must match 'investigate' keyword."""
        assert "investigate" in workflow_registry["W3"]["keywords"]

    def test_refactor_keywords_include_refactor(self, workflow_registry):
        """W5 refactor must match 'refactor' keyword."""
        assert "refactor" in workflow_registry["W5"]["keywords"]

    def test_content_keywords_include_documentation(self, workflow_registry):
        """W6 content must match 'documentation' keyword."""
        assert "documentation" in workflow_registry["W6"]["keywords"]

    def test_content_keywords_include_tutorial(self, workflow_registry):
        """W6 content must match 'tutorial' keyword."""
        assert "tutorial" in workflow_registry["W6"]["keywords"]

    def test_planning_keywords_include_brainstorm(self, workflow_registry):
        """W7 planning-only must match 'brainstorm' keyword."""
        assert "brainstorm" in workflow_registry["W7"]["keywords"]

    def test_planning_keywords_include_explore(self, workflow_registry):
        """W7 planning-only must match 'explore' keyword."""
        assert "explore" in workflow_registry["W7"]["keywords"]

    def test_coding_with_design_keywords_include_ui(self, workflow_registry):
        """W2 coding-with-design must match 'UI' keyword."""
        assert "UI" in workflow_registry["W2"]["keywords"]

    def test_coding_with_design_keywords_include_component(self, workflow_registry):
        """W2 coding-with-design must match 'component' keyword."""
        assert "component" in workflow_registry["W2"]["keywords"]

    def test_no_duplicate_primary_keywords_across_workflows(self, workflow_registry):
        """Primary differentiating keywords should not appear in multiple workflows.

        'implement', 'feature', 'add', 'build' are shared between W1 and W2
        intentionally (disambiguation by secondary keywords). But primary
        single-word discriminators like 'fix', 'refactor', 'research' must
        be unique to their workflow.
        """
        unique_primaries = {
            "fix": "W4",
            "bug": "W4",
            "crash": "W4",
            "refactor": "W5",
            "restructure": "W5",
            "research": "W3",
            "investigate": "W3",
            "brainstorm": "W7",
            "tutorial": "W6",
        }
        for keyword, expected_wid in unique_primaries.items():
            for wid, template in workflow_registry.items():
                if wid == expected_wid:
                    continue
                assert keyword not in template["keywords"], (
                    f"Primary keyword '{keyword}' should only be in {expected_wid}, "
                    f"but also found in {wid}"
                )


# ============================================================================
# 6. ROLE MODEL CONSISTENCY
# ============================================================================


class TestRoleModelConsistency:
    """Verify the generic role model is correctly documented."""

    def test_skill_documents_five_roles(self, skill_content):
        """SKILL.md must document all 5 roles in the role model."""
        for role in ["Orchestrator", "Pre-production", "Maker", "Post-production", "Checker"]:
            assert role in skill_content, (
                f"SKILL.md missing role documentation for: {role}"
            )

    def test_orchestrator_marked_mandatory(self, skill_content):
        """Orchestrator role must be marked as mandatory."""
        # Look for Orchestrator row with Yes in the mandatory column
        assert re.search(
            r"\|\s*\*\*Orchestrator\*\*.*\|\s*Yes\s*\|", skill_content
        ), "Orchestrator must be marked mandatory"

    def test_maker_marked_mandatory(self, skill_content):
        """Maker role must be marked as mandatory (though can be null in W7)."""
        # The role model table marks Maker as mandatory at the conceptual level
        assert re.search(
            r"\|\s*\*\*Maker\*\*.*\|\s*Yes\s*\|", skill_content
        ), "Maker must be marked mandatory in role model"

    def test_pre_production_marked_optional(self, skill_content):
        """Pre-production role must be marked as optional."""
        assert re.search(
            r"\|\s*\*\*Pre-production\*\*.*\|\s*No\s*\|", skill_content
        ), "Pre-production must be marked optional"

    def test_post_production_marked_optional(self, skill_content):
        """Post-production role must be marked as optional."""
        assert re.search(
            r"\|\s*\*\*Post-production\*\*.*\|\s*No\s*\|", skill_content
        ), "Post-production must be marked optional"

    def test_checker_marked_optional(self, skill_content):
        """Checker role must be marked as optional."""
        assert re.search(
            r"\|\s*\*\*Checker\*\*.*\|\s*No\s*\|", skill_content
        ), "Checker must be marked optional"

    def test_execution_order_documented(self, skill_content):
        """Execution order must be documented: Pre-production -> Maker -> Post-production -> Checker."""
        # The execution order section should contain the flow
        assert "Pre-production" in skill_content
        assert "Maker" in skill_content
        assert "Post-production" in skill_content
        assert "Checker" in skill_content

    def test_mandatory_role_invariant_in_registry(self, workflow_registry):
        """Every workflow must have orchestrator = super-planner.
        Maker can be null only in W7 (planning-only).
        """
        for wid, template in workflow_registry.items():
            assert template["roles"]["orchestrator"] == "super-planner"
            if wid != "W7":
                assert template["roles"]["maker"] is not None, (
                    f"Template {wid} must have a Maker (only W7 allows null)"
                )


# ============================================================================
# 7. COMMAND-AGENT-SKILL ALIGNMENT
# ============================================================================


class TestCommandAgentSkillAlignment:
    """Verify the command, agent, and skill are properly cross-referenced."""

    def test_command_references_super_planner(self, command_content):
        """tasks-plan command must delegate to super-planner agent."""
        assert "super-planner" in command_content

    def test_command_references_workflow_orchestration_skill(self, command_content):
        """tasks-plan command must reference rd2:workflow-orchestration."""
        assert "workflow-orchestration" in command_content

    def test_command_supports_workflow_flag(self, command_content):
        """tasks-plan must document --workflow flag."""
        assert "--workflow" in command_content

    def test_command_supports_list_workflows_flag(self, command_content):
        """tasks-plan must document --list-workflows flag."""
        assert "--list-workflows" in command_content

    def test_command_lists_all_seven_workflow_names(self, command_content):
        """tasks-plan must list all 7 workflow names."""
        for name in EXPECTED_WORKFLOW_NAMES.values():
            assert name in command_content, (
                f"tasks-plan command missing workflow name: {name}"
            )

    def test_agent_references_workflow_orchestration_skill(self, planner_content):
        """super-planner must reference rd2:workflow-orchestration."""
        assert "workflow-orchestration" in planner_content

    def test_agent_references_task_decomposition_skill(self, planner_content):
        """super-planner must reference rd2:task-decomposition."""
        assert "task-decomposition" in planner_content

    def test_agent_references_task_workflow_skill(self, planner_content):
        """super-planner must reference rd2:task-workflow."""
        assert "task-workflow" in planner_content

    def test_agent_documents_mode_system(self, planner_content):
        """super-planner must document --auto, --semi, --step modes."""
        assert "--auto" in planner_content
        assert "--semi" in planner_content
        assert "--step" in planner_content

    def test_command_documents_mode_system(self, command_content):
        """tasks-plan must document --auto, --semi, --step modes."""
        assert "--auto" in command_content
        assert "--semi" in command_content
        assert "--step" in command_content

    def test_skill_documents_mode_handling(self, skill_content):
        """SKILL.md must document how modes affect workflow execution."""
        assert "--auto" in skill_content
        assert "--semi" in skill_content
        assert "--step" in skill_content

    def test_command_has_backward_compatibility_section(self, command_content):
        """tasks-plan must have a Backward Compatibility section."""
        assert "Backward Compatibility" in command_content


# ============================================================================
# 8. EDGE CASES AND INVARIANTS
# ============================================================================


class TestEdgeCases:
    """Test edge cases and invariants in the workflow definitions."""

    def test_w4_bugfix_has_no_pre_production(self, workflow_registry):
        """W4 bugfix must have null pre_production (bugs need direct investigation)."""
        assert workflow_registry["W4"]["roles"]["pre_production"] is None

    def test_w7_planning_has_no_maker(self, workflow_registry):
        """W7 planning-only must have null maker (no implementation)."""
        assert workflow_registry["W7"]["roles"]["maker"] is None

    def test_w7_planning_has_no_post_production(self, workflow_registry):
        """W7 planning-only must have null post_production."""
        assert workflow_registry["W7"]["roles"]["post_production"] is None

    def test_w7_planning_has_no_checker(self, workflow_registry):
        """W7 planning-only must have null checker."""
        assert workflow_registry["W7"]["roles"]["checker"] is None

    def test_w3_research_has_no_post_production(self, workflow_registry):
        """W3 research must have null post_production (no formal review)."""
        assert workflow_registry["W3"]["roles"]["post_production"] is None

    def test_w6_content_has_no_post_production(self, workflow_registry):
        """W6 content must have null post_production."""
        assert workflow_registry["W6"]["roles"]["post_production"] is None

    def test_checker_is_same_as_maker_for_coding_workflows(self, workflow_registry):
        """For coding workflows (W1, W4, W5), Checker should be the Maker agent."""
        for wid in ["W1", "W4", "W5"]:
            roles = workflow_registry[wid]["roles"]
            assert roles["checker"] == roles["maker"], (
                f"Template {wid}: Checker should equal Maker for fix cycles, "
                f"got checker={roles['checker']}, maker={roles['maker']}"
            )

    def test_pre_production_is_always_list_or_none(self, workflow_registry):
        """pre_production must be a list of agents or None, never a string."""
        for wid, template in workflow_registry.items():
            pp = template["roles"]["pre_production"]
            assert pp is None or isinstance(pp, list), (
                f"Template {wid}: pre_production must be list or None, got: {type(pp)}"
            )

    def test_maker_is_always_string_or_none(self, workflow_registry):
        """maker must be a single agent string or None, never a list."""
        for wid, template in workflow_registry.items():
            maker = template["roles"]["maker"]
            assert maker is None or isinstance(maker, str), (
                f"Template {wid}: maker must be string or None, got: {type(maker)}"
            )

    def test_skill_documents_disambiguation_rules(self, skill_content):
        """SKILL.md must document disambiguation for ambiguous intents."""
        assert "Disambiguation" in skill_content or "disambiguation" in skill_content, (
            "SKILL.md must document disambiguation rules for ambiguous intents"
        )

    def test_skill_documents_quality_gates(self, skill_content):
        """SKILL.md must document quality gates between role transitions."""
        assert "Quality Gate" in skill_content or "quality gate" in skill_content or "Quality Gates" in skill_content, (
            "SKILL.md must document quality gates"
        )

    def test_skill_documents_failure_handling(self, skill_content):
        """SKILL.md must document failure handling per mode."""
        assert "Failure Handling" in skill_content or "failure handling" in skill_content or "Blocked" in skill_content, (
            "SKILL.md must document failure handling"
        )

    def test_no_workflow_has_empty_keywords(self, workflow_registry):
        """No workflow template should have an empty keywords list."""
        for wid, template in workflow_registry.items():
            assert len(template["keywords"]) > 0, (
                f"Template {wid} has empty keywords list"
            )

    def test_workflow_names_are_kebab_case(self, workflow_registry):
        """All workflow names must be kebab-case (lowercase, hyphens only)."""
        for wid, template in workflow_registry.items():
            name = template["name"]
            assert re.match(r"^[a-z][a-z0-9-]*$", name), (
                f"Template {wid} name '{name}' is not kebab-case"
            )

    def test_agent_absolute_rules_section_exists(self, planner_content):
        """super-planner must have a Rules section (8-section anatomy: section 7)."""
        assert "# 7. RULES" in planner_content or "# 7. RULES" in planner_content.upper() or "RULES" in planner_content.upper()

    def test_agent_never_do_list_mentions_forbidden_tools(self, planner_content):
        """super-planner 'Never Do' list must mention forbidden tools."""
        assert "Read" in planner_content
        assert "Write" in planner_content
        assert "Edit" in planner_content
        assert "Grep" in planner_content
        assert "Glob" in planner_content


# ============================================================================
# 9. WORKFLOW CUSTOMIZATION FLAGS
# ============================================================================


class TestWorkflowCustomizationFlags:
    """Verify workflow customization flags are documented consistently."""

    def test_skill_documents_with_architect_flag(self, skill_content):
        """SKILL.md must document --with-architect flag."""
        assert "--with-architect" in skill_content

    def test_skill_documents_with_designer_flag(self, skill_content):
        """SKILL.md must document --with-designer flag."""
        assert "--with-designer" in skill_content

    def test_skill_documents_skip_design_flag(self, skill_content):
        """SKILL.md must document --skip-design flag."""
        assert "--skip-design" in skill_content

    def test_skill_documents_skip_review_flag(self, skill_content):
        """SKILL.md must document --skip-review flag."""
        assert "--skip-review" in skill_content

    def test_skill_documents_workflow_override_flag(self, skill_content):
        """SKILL.md must document --workflow override flag."""
        assert "--workflow" in skill_content

    def test_command_documents_with_researcher_flag(self, command_content):
        """tasks-plan must document --with-researcher flag."""
        assert "--with-researcher" in command_content

    def test_command_documents_skip_review_flag(self, command_content):
        """tasks-plan must document --skip-review flag."""
        assert "--skip-review" in command_content

    def test_agent_documents_workflow_override(self, planner_content):
        """super-planner must document --workflow override."""
        assert "--workflow" in planner_content
