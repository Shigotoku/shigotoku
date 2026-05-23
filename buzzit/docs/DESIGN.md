---
# DESIGN.md - BuzzIt Clean & Modern Design System
brand:
  name: "BuzzIt"
  essence: ["clean", "airy", "trustworthy", "modern"]
colors:
  primary: "#4f46e5" # Indigo 600
  secondary: "#0ea5e9" # Sky 500
  accent: "#10b981" # Emerald 500
  background: "#fafafa" # Off-white (Neutral 50)
  surface: "#ffffff" # Pure White
  text_main: "#1e293b" # Slate 800
  text_muted: "#64748b" # Slate 500
  border: "#e2e8f0" # Slate 200
typography:
  font_display: "'Outfit', sans-serif"
  font_body: "'Inter', sans-serif"
  sizes:
    h1: "5rem (80px) - Tight tracking (-0.02em)"
    h2: "3.5rem (56px) - Tight tracking (-0.02em)"
spacing:
  section_y: "8rem (128px)"
  component_gap: "2rem (32px)"
border_radius:
  card: "24px (xl)"
  button: "9999px (full)"
---

# BuzzIt Design Principles (Clean Theme)

This document defines the core aesthetic for BuzzIt, focusing on a clean, off-white, and airy feel that inspires trust and professionalism.

## 1. Visual Hierarchy & Contrast
- **Off-White Theme**: Use `#fafafa` (or Tailwind's `slate-50`) as the absolute background to provide a clean canvas.
- **Soft Shadows**: Use large, soft shadows (`shadow-2xl`, `shadow-slate-200`) instead of harsh borders to lift elements off the page.
- **Subtle Accents**: Use Indigo and Sky blue sparingly for Call-to-Actions (CTAs) and important highlights.

## 2. Imagery & Media (The "Clean" Factor)
- **High-Impact, Bright Imagery**: Landing pages must feature large, borderless, bright, and airy images (e.g., sunlit offices, clean salons).
- **Asymmetric Grid Layouts**: Display features alongside striking visuals. Images should be the hero of the content.
- **Animations**: Add smooth fade-in and slide-up animations on scroll to make the site feel alive but not overwhelming.

## 3. Typography
- **Headings**: Use `Outfit` for large, bold, and tightly tracked headings in dark Slate (`text-slate-800`).
- **Body**: Use `Inter` for extreme readability in medium Slate (`text-slate-500`).

## 4. UI Components
- **Buttons**: Pill-shaped (`rounded-full`), solid colors for primary actions, and very soft hover animations (`hover:-translate-y-0.5`).
- **Cards**: Pure white (`bg-white`), large corner radii (`rounded-3xl`), and very soft borders or shadows.

*Note: Always refer to these tokens when generating HTML/Tailwind for BuzzIt.*
