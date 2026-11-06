# Spec Delta

## Purpose
Give users a labelled reference value across currencies, without ever implying that the platform converts money.

## ADDED Requirements

### Requirement: Official exchange rates
The system SHALL obtain the official USD and EUR rates in ARS from dolarapi.com (`/v1/dolares/oficial`, `/v1/cotizaciones/eur`), using the average of `compra` and `venta` as reference and `fechaActualizacion` as the rate date. Rates SHALL be cached for 10 minutes.

#### Scenario: Rates available
- **WHEN** both rate requests succeed
- **THEN** the system has ARS-per-USD and ARS-per-EUR reference rates with their update date

#### Scenario: Repeated use within 10 minutes
- **WHEN** an estimate is needed again within 10 minutes
- **THEN** no new request is made to the FX source

### Requirement: Cross-currency conversion
The system SHALL convert an amount between ARS, USD and EUR using the reference rates, crossing through ARS when neither side is ARS, and rounding to the cent.

#### Scenario: ARS to USD
- **WHEN** converting $ 100.000 with a reference rate of 1.545 ARS per USD
- **THEN** the estimate is US$ 64,72

#### Scenario: USD to EUR through ARS
- **WHEN** converting US$ 100 with 1.545 ARS/USD and 1.731 ARS/EUR
- **THEN** the estimate is € 89,25

### Requirement: Labelled estimates
Every estimated value SHALL be shown with "≈", the words "estimado al tipo de cambio oficial" and the rate's update date. Estimates SHALL never be shown as an amount that will be credited.

#### Scenario: Disabled cross-currency destination
- **WHEN** a destination in another currency is shown disabled during a transfer of $ 100.000
- **THEN** it shows "$ 100.000 ≈ US$ 64,72, estimado al tipo de cambio oficial (5 nov 2026, 14:49)"

### Requirement: Estimated total in ARS
The home screen SHALL show, below the per-currency balances, a total of all accounts' available amounts converted to ARS, labelled as an estimate with source and date. The per-currency balances SHALL remain the primary figures.

#### Scenario: Mixed-currency accounts
- **WHEN** the user has $ 855.000 and US$ 440 available, at 1.545 ARS/USD
- **THEN** the home shows "Total estimado: ≈ $ 1.534.800,00" with its label

### Requirement: Graceful FX failure
If the FX source fails or returns unexpected data, the system SHALL hide every estimate and SHALL keep all other functionality working. No error SHALL block a money operation because of FX.

#### Scenario: FX source unreachable
- **WHEN** dolarapi.com does not respond
- **THEN** the home shows only per-currency balances, disabled destinations show only the currency reason, and no error dialog appears

#### Scenario: Unexpected response shape
- **WHEN** the FX response lacks numeric `compra`/`venta`
- **THEN** it is treated as unavailable
