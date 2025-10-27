package com.example.module;

import org.junit.Before;
import org.junit.Test;
import static org.junit.Assert.*;

import java.util.Map;

/**
 * Tests for FunctionTemplate
 */
public class FunctionTemplateTest {

    private FunctionTemplate functionTemplate;

    @Before
    public void setUp() {
        functionTemplate = new FunctionTemplate();
    }

    @Test
    public void testFunctionNameSmoke() {
        Map<String, Object> result = functionTemplate.functionName("test", 10);
        assertNotNull(result);
        assertTrue(result.containsKey("key1"));
        assertTrue(result.containsKey("key2"));
    }

    @Test
    public void testFunctionNameValidInput() {
        Map<String, Object> result = functionTemplate.functionName("hello", 42);

        assertEquals("processed_hello", result.get("key1"));
        assertEquals(84, result.get("key2"));
    }

    @Test(expected = IllegalArgumentException.class)
    public void testFunctionNameEmptyString() {
        functionTemplate.functionName("", 10);
    }

    @Test(expected = IllegalArgumentException.class)
    public void testFunctionNameNullString() {
        functionTemplate.functionName(null, 10);
    }

    @Test(expected = IllegalArgumentException.class)
    public void testFunctionNameNegativeNumber() {
        functionTemplate.functionName("test", -1);
    }

    @Test
    public void testFunctionNameZero() {
        Map<String, Object> result = functionTemplate.functionName("test", 0);
        assertEquals(0, result.get("key2"));
    }

    @Test
    public void testFunctionNameLargeNumber() {
        Map<String, Object> result = functionTemplate.functionName("test", 1000000);
        assertEquals(2000000, result.get("key2"));
    }

    // Parametrized-style tests using test methods
    @Test
    public void testFunctionNameParametrized1() {
        testParametrizedCase("hello", 10, "processed_hello", 20);
    }

    @Test
    public void testFunctionNameParametrized2() {
        testParametrizedCase("world", 5, "processed_world", 10);
    }

    @Test
    public void testFunctionNameParametrized3() {
        testParametrizedCase("test", 0, "processed_test", 0);
    }

    private void testParametrizedCase(String inputStr, int inputNum,
                                       String expectedKey1, int expectedKey2) {
        Map<String, Object> result = functionTemplate.functionName(inputStr, inputNum);
        assertEquals(expectedKey1, result.get("key1"));
        assertEquals(expectedKey2, result.get("key2"));
    }
}
