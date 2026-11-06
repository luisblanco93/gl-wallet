# Spec Delta

## ADDED Requirements

### Requirement: Theme selection
The system SHALL offer a keyboard-accessible dropdown named "Tema" near the profile in the application header, on desktop and mobile, with exactly "Bosque y marfil" and "Azul y porcelana". Switching SHALL immediately update the application's palette and fonts without navigating, reloading, resetting forms or changing money data. Bosque y marfil SHALL be the default.

#### Scenario: Switch appearance
- **WHEN** the user selects either theme in the header
- **THEN** the selected palette and fonts apply across the application while the current route and form values are preserved

#### Scenario: Remember appearance
- **WHEN** the user reloads or returns to the application
- **THEN** the saved theme is applied before React renders, including on the login screen

#### Scenario: Invalid or unavailable storage
- **WHEN** the stored theme is absent, invalid or unreadable
- **THEN** Bosque y marfil is used
- **WHEN** saving the preference fails
- **THEN** the theme still changes for the current page without blocking the application

### Requirement: Preserve layout and meaning
Both themes SHALL retain the existing card heights, padding, gaps, typography sizes, line heights and responsive layout. Header controls SHALL fit without horizontal scrolling at 320px and wider. Financial states SHALL retain their labels, icons and distinct semantic colors; a theme SHALL NOT change financial calculations or API requests.

#### Scenario: Desktop and mobile appearance
- **WHEN** either theme is selected at desktop or mobile widths
- **THEN** account cards retain their dimensions and spacing, all header controls remain usable, and text and controls meet WCAG AA contrast
