Feature: Antigravity Backend Adapter

  This feature verifies that the Antigravity (agy) backend adapter is correctly implemented
  and meets all requirements specified in task 0352.

  Scenario: Backend selection uses BACKEND environment variable
    Given the BACKEND environment variable is set to "antigravity"
    And the acpx-query module is loaded
    When getBackend() is called
    Then it returns "antigravity"

  Scenario: Backend selection defaults to acpx
    Given the BACKEND environment variable is not set
    And the acpx-query module is loaded
    When getBackend() is called
    Then it returns "acpx"

  Scenario: Backend selection accepts 'agy' as alias
    Given the BACKEND environment variable is set to "agy"
    And the acpx-query module is loaded
    When getBackend() is called
    Then it returns "antigravity"

  Scenario: agy health check returns healthy when agy is installed
    Given the agy CLI is installed and available in PATH
    When checkAgyHealth() is called
    Then the result has healthy set to true
    And the result includes a version string

  Scenario: agy health check returns unhealthy when agy is not installed
    Given the agy CLI is not available in PATH
    When checkAgyHealth() is called with a non-existent binary
    Then the result has healthy set to false
    And the result includes an error message

  Scenario: queryLlm uses agy backend when BACKEND=antigravity
    Given the BACKEND environment variable is set to "antigravity"
    And the acpx-query module is loaded
    When queryLlm("echo test") is called
    Then it delegates to queryLlmAgy

  Scenario: queryLlm uses acpx backend when BACKEND=acpx
    Given the BACKEND environment variable is set to "acpx"
    And the acpx-query module is loaded
    When queryLlm("echo test") is called
    Then it delegates to the acpx implementation

  Scenario: queryLlmFromFile uses agy backend when BACKEND=antigravity
    Given the BACKEND environment variable is set to "antigravity"
    And the acpx-query module is loaded
    And a temporary file exists with test content
    When queryLlmFromFile(filePath) is called
    Then it delegates to queryLlmFromFileAgy

  Scenario: runSlashCommand returns not supported error for agy backend
    Given the BACKEND environment variable is set to "antigravity"
    And the acpx-query module is loaded
    When runSlashCommand("/some:command") is called
    Then the result has ok set to false
    And the stderr contains "not supported"
    And the exitCode is 1

  Scenario: checkHealth returns agy health when BACKEND=antigravity
    Given the BACKEND environment variable is set to "antigravity"
    And the acpx-query module is loaded
    When checkHealth() is called
    Then the result has backend set to "antigravity"
    And the result reflects agy health status

  Scenario: checkAllBackendsHealth checks both acpx and agy
    Given the acpx-query module is loaded
    When checkAllBackendsHealth() is called
    Then the result includes acpx health status
    And the result includes agy health status

  Scenario: Interface compatibility - result structure matches AcpxQueryResult
    Given the BACKEND environment variable is set to "antigravity"
    And the acpx-query module is loaded
    When queryLlmAgy("echo test") is called
    Then the result has ok field of type boolean
    And the result has exitCode field of type number
    And the result has stdout field of type string
    And the result has stderr field of type string
    And the result has durationMs field of type number
    And the result has timedOut field of type boolean
