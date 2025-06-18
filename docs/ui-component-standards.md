# UI Component Standards for Zero Gate ESO Platform

## Design System

### Color Palette
- **Primary Blue**: `#3366FF` - Main brand color for CTAs and interactive elements
- **Dark Blue**: `#1E40AF` - Hover states and emphasis
- **Light Blue**: `#60A5FA` - Backgrounds and subtle accents

### Status Colors
- **Success Green**: `#10B981` - Success states, positive metrics
- **Warning Amber**: `#F59E0B` - Warning states, attention needed
- **Error Red**: `#EF4444` - Error states, critical alerts
- **Neutral Gray**: `#6B7280` - Secondary text and borders

### Role Badge Colors
- **Owner**: Purple variants
- **Admin**: Blue variants
- **Manager**: Green variants
- **User**: Gray variants
- **Viewer**: Orange variants

## Component Specifications

### Cards
- **Background**: White (light mode), dark gray (dark mode)
- **Border**: 1px solid light gray
- **Border Radius**: `0.5rem`
- **Shadow**: Subtle drop shadow `0 1px 3px 0 rgb(0 0 0 / 0.1)`
- **Padding**: `1.5rem`
- **Hover Effect**: Enhanced shadow and subtle scale

### Buttons
- **Primary**: Blue background, white text, 0.75rem padding
- **Secondary**: Transparent background, blue border and text
- **Ghost**: Transparent background, gray text, hover background

### Typography
- **Font Family**: Inter, system fonts
- **Headings**: Various weights (400-700)
- **Body Text**: 16px base size, 1.5 line height
- **Small Text**: 14px for secondary information

### Spacing System
- **XS**: 4px
- **SM**: 8px
- **MD**: 16px
- **LG**: 24px
- **XL**: 32px
- **2XL**: 48px

## Layout Standards

### Grid Systems
- **Desktop**: 4-column grid for cards
- **Tablet**: 2-column grid
- **Mobile**: Single column layout

### Container Spacing
- **Desktop**: 2rem padding
- **Tablet**: 1.5rem padding  
- **Mobile**: 1rem padding

### Component Spacing
- **Between sections**: 2-3rem
- **Between components**: 1rem
- **Within components**: 0.5-1rem

## Interactive Elements

### Hover States
- **Cards**: Enhanced shadow and border color change
- **Buttons**: Background color darkening or lightening
- **Icons**: Color transition to primary blue

### Focus States
- **Outline**: 2px solid primary blue
- **Offset**: 2px from element
- **Border Radius**: Match element radius

### Selection States
- **Selected Cards**: Blue border, blue accent color
- **Selected Badges**: Enhanced contrast and bold text
- **Active Navigation**: Blue background and white text

## Responsive Breakpoints

### Screen Sizes
- **Mobile**: < 640px
- **Tablet**: 640px - 1024px
- **Desktop**: > 1024px

### Layout Adaptations
- **Mobile**: Stacked layout, full-width components
- **Tablet**: Two-column grids, collapsible elements
- **Desktop**: Full layout with all components visible

## Animation Standards

### Transition Duration
- **Fast**: 150ms for hover states
- **Normal**: 300ms for state changes
- **Slow**: 500ms for page transitions

### Easing Functions
- **Default**: cubic-bezier(0.4, 0, 0.2, 1)
- **Smooth**: ease-in-out for most transitions

## Accessibility Requirements

### Color Contrast
- **Text on Background**: Minimum 4.5:1 ratio
- **Interactive Elements**: Minimum 3:1 ratio
- **Large Text**: Minimum 3:1 ratio

### Touch Targets
- **Minimum Size**: 44x44px on mobile
- **Spacing**: 8px minimum between targets
- **Visual Feedback**: Clear hover and active states

### Keyboard Navigation
- **Tab Order**: Logical flow through interactive elements
- **Focus Indicators**: Clear visual indication of focused element
- **Keyboard Shortcuts**: Support for common shortcuts where appropriate