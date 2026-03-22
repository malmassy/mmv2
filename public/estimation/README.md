# Estimation Images

This directory contains images for estimation questions.

## Usage

Images placed in this directory can be referenced in your code using:

```tsx
<img src="/estimation/your-image.jpg" alt="Description" />
```

Or with Next.js Image component:

```tsx
import Image from 'next/image';

<Image src="/estimation/your-image.jpg" alt="Description" width={500} height={300} />
```

## File Naming Convention

Consider using descriptive names like:
- `battery-aa.jpg`
- `coin-quarter.jpg`
- `length-object-1.jpg`
- etc.

## Supported Formats

- JPEG (.jpg, .jpeg)
- PNG (.png)
- WebP (.webp)
- SVG (.svg)
