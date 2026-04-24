# Bugfix Requirements Document

## Introduction

The Appraisal Report card in the HR Reports page (`PrebuiltReports.jsx`) displays a broken icon placeholder instead of a star icon. The `SvgIcon` component is called with `name="star"`, but no `star.svg` file exists in the SVG assets directory (`hr_and_asset_mgt/src/assets/svg/`). As a result, the component falls back to rendering the text `Icon "star" not found` inside a `<span class="icon-missing">` element, which is visible to users in the report card header.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the HR Reports page renders the Appraisal Report card THEN the system displays the text `Icon "star" not found` in place of the star icon

1.2 WHEN `SvgIcon` is called with `name="star"` THEN the system fails to resolve any matching SVG file path and renders the fallback error span

### Expected Behavior (Correct)

2.1 WHEN the HR Reports page renders the Appraisal Report card THEN the system SHALL display a star SVG icon in the report card header

2.2 WHEN `SvgIcon` is called with `name="star"` THEN the system SHALL resolve a matching `star.svg` file from the assets directory and render it as an `<img>` element

### Unchanged Behavior (Regression Prevention)

3.1 WHEN `SvgIcon` is called with any other valid icon name (e.g., `"document"`, `"download"`, `"user"`) THEN the system SHALL CONTINUE TO resolve and render the correct SVG icon without any change

3.2 WHEN the HR Reports page renders all other report cards (Payroll, Attendance, Compliance, etc.) THEN the system SHALL CONTINUE TO display their respective icons correctly

3.3 WHEN `SvgIcon` is called with an icon name that genuinely does not exist THEN the system SHALL CONTINUE TO render the `Icon "[name]" not found` fallback span as before

---

## Bug Condition

**Bug Condition Function:**
```pascal
FUNCTION isBugCondition(X)
  INPUT: X of type SvgIconProps
  OUTPUT: boolean

  // Returns true when the icon name is "star" and no star.svg exists in assets
  RETURN X.name = "star" AND NOT exists("/src/assets/svg/star.svg")
END FUNCTION
```

**Property: Fix Checking**
```pascal
FOR ALL X WHERE isBugCondition(X) DO
  result ← SvgIcon'(X)
  ASSERT result renders an <img> element with src pointing to star.svg
  ASSERT result does NOT render a <span class="icon-missing"> element
END FOR
```

**Property: Preservation Checking**
```pascal
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT SvgIcon(X) = SvgIcon'(X)
END FOR
```
