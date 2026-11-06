# Spec Delta

## Purpose
Represent, parse and display money without floating-point errors or misleading cross-currency totals.

## ADDED Requirements

### Requirement: Amount input parsing
The system SHALL convert a user-entered amount into an integer number of cents following the es-AR convention: `,` is the decimal separator and `.` is the thousands separator when it groups digits in threes (the first group starting with a non-zero digit). A `.` that does not form a thousands group SHALL be read as the decimal separator. Amounts SHALL have at most 2 decimals and a minimum of 0.01. Invalid input SHALL produce a validation error, never a number.

#### Scenario: Valid amount with comma decimal
- **WHEN** the user enters `1234,56`
- **THEN** the parsed value is `123456` cents

#### Scenario: Thousands separator
- **WHEN** the user enters `1.234,56` or `1.500`
- **THEN** the parsed values are `123456` and `150000` cents

#### Scenario: Dot as decimal separator
- **WHEN** the user enters `1234.56`
- **THEN** the parsed value is `123456` cents

#### Scenario: More than two decimals
- **WHEN** the user enters `10,015` or `1234.567`
- **THEN** parsing fails with "maximum 2 decimals" and no amount is produced

#### Scenario: Empty, zero, negative or non-numeric input
- **WHEN** the user enters ``, `0`, `-5` or `abc`
- **THEN** parsing fails with a validation error describing the problem

### Requirement: Conversion at the API boundary
The system SHALL convert cents to the API's decimal number only when building a request, and SHALL convert API decimal numbers to cents (rounded to the nearest cent) immediately when reading a response.

#### Scenario: Sending an amount
- **WHEN** a request carries `123456` cents
- **THEN** the request body contains `amount: 1234.56`

#### Scenario: Reading a float balance
- **WHEN** the API returns `balance: 0.30000000000000004`
- **THEN** the domain value is `30` cents

### Requirement: Amount formatting
The system SHALL format amounts with the es-AR locale and the account's currency symbol (`$` ARS, `US$` USD, `€` EUR), 2 decimals, and the minus sign `−` for negative values.

#### Scenario: Formatting ARS and USD
- **WHEN** formatting `123456` cents in ARS and `44000` cents in USD
- **THEN** the results are `$ 1.234,56` and `US$ 440,00`

#### Scenario: Negative amount
- **WHEN** formatting `-56000` cents in USD
- **THEN** the result is `−US$ 560,00`

### Requirement: No cross-currency sums
The system SHALL NOT add amounts of different currencies. Totals SHALL be computed per currency.

#### Scenario: Totals for mixed accounts
- **WHEN** computing totals for an ARS account of $ 855.000 and a USD account of US$ 440
- **THEN** the result is two totals, one per currency, and no combined figure
