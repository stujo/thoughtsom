Feature: As a user, I want a user interface enable me to create and organize my thoughts

  Scenario: List of Thoughts

    Given a user with existing saved thoughts
    When a user lists their thoughts
    Then a list of thoughts is returned

  Scenario: Create a new thought

    Given a user
    When a user authors a new thought
    Then a new thought is saved to the server