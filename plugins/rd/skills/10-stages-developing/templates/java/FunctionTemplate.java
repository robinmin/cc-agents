package com.example.module;

import java.util.HashMap;
import java.util.Map;

/**
 * [Brief description of what this class does]
 */
public class FunctionTemplate {

    /**
     * [Brief description of what the method does].
     *
     * @param param1 [Description of param1]
     * @param param2 [Description of param2]
     * @return Map containing processed results with keys "key1" and "key2"
     * @throws IllegalArgumentException if param1 is empty or param2 is negative
     *
     * @example
     * <pre>
     * FunctionTemplate ft = new FunctionTemplate();
     * Map&lt;String, Object&gt; result = ft.functionName("example", 42);
     * // Returns: {key1="processed_example", key2=84}
     * </pre>
     */
    public Map<String, Object> functionName(String param1, int param2) {
        // Input validation
        if (param1 == null || param1.isEmpty()) {
            throw new IllegalArgumentException("param1 cannot be empty");
        }

        if (param2 < 0) {
            throw new IllegalArgumentException("param2 must be non-negative");
        }

        // Implementation
        Map<String, Object> result = new HashMap<>();
        result.put("key1", "processed_" + param1);
        result.put("key2", param2 * 2);

        return result;
    }
}
