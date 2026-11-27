# CLAUDE.md - AI Assistant Guide

**Last Updated:** 2025-12-01
**Project:** My Portfolio - Professional Profile Showcase Platform
**Version:** 0.1.0
**Live Demo:** https://hyeongjun.me

---

## Project Overview

This is a React-based professional portfolio and user profile showcase platform. Users can create and browse professional profiles featuring skills, projects, career history, posts, and contact information. The application includes authentication (credentials + Google OAuth), infinite scroll pagination, and rich animations.

**Key Features:**
- User authentication with session management
- Dynamic user profiles with customizable sections
- Infinite scroll user listing with cursor-based pagination
- Post creation and viewing
- Responsive design with mobile-first approach
- Rich animations using Framer Motion
- SEO optimization with structured data

---

## Architecture & Directory Structure

```
my-portfolio/
├── .github/workflows/      # CI/CD pipeline (GitHub Actions)
├── public/                 # Static assets
│   ├── fonts/             # Custom fonts (BMHANNA)
│   ├── index.html         # Entry HTML
│   └── manifest.json      # PWA manifest
├── src/
│   ├── apis/              # API integration layer
│   │   ├── Api.js         # Main API functions (users, careers, posts)
│   │   └── Login.js       # Authentication API
│   ├── assets/            # Static data and images
│   │   ├── data.js        # Profile data
│   │   ├── certs.js       # Certifications
│   │   └── images.js      # Image imports
│   ├── components/        # React components (23 files)
│   │   ├── header/        # Header variants
│   │   ├── Card.js        # Card components (Profile, Tech, History)
│   │   ├── Section.js     # Section wrapper
│   │   ├── SearchBar.js   # Search functionality
│   │   └── ...            # Other UI components
│   ├── hooks/             # Custom React hooks
│   │   ├── useSearchOpen.js    # Search modal state
│   │   └── useClickOutside.js  # Outside click detection
│   ├── layout/            # Layout components
│   │   └── HeaderLayout.js     # Fixed header wrapper
│   ├── pages/             # Page components (routes)
│   │   ├── LoginPage.js   # Authentication page
│   │   ├── UserPage.js    # User profile page
│   │   ├── UserListPage.js     # User listing with infinite scroll
│   │   └── PostPage.js    # Post details page
│   ├── styles/            # Styling system (hierarchical)
│   │   ├── tokens/        # Design tokens (colors, typography, spacing)
│   │   ├── primitives/    # Basic styled components (Box, Button)
│   │   ├── compositions/  # Feature-specific components (Card, Project)
│   │   ├── layout/        # Layout-only styles (Header, Footer)
│   │   ├── theme/         # Theme configuration
│   │   ├── AnimationStyles.js  # Motion components
│   │   ├── IconStyles.js       # Icon components
│   │   ├── ImageStyles.js      # Image components
│   │   └── GlobalStyle.js      # Global CSS reset
│   ├── utils/             # Utility functions
│   │   ├── format.js      # Date/time formatting
│   │   ├── isEmpty.js     # Empty checks
│   │   ├── sections.js    # Section configuration
│   │   └── string.js      # String utilities
│   ├── App.js             # Main app component
│   └── index.js           # Entry point
├── .env                   # Environment variables
├── .eslintrc.json         # ESLint configuration
├── .prettierrc            # Prettier configuration
├── craco.config.js        # Webpack path aliases
├── jsconfig.json          # JavaScript config
├── package.json           # Dependencies
├── README.md              # Project documentation
└── STYLE_GUIDE.md         # Detailed styling guide (Korean)
```

**File Statistics:**
- ~2,340 lines of JavaScript code
- 64 JS/JSX files in src directory
- 165KB source code size (excluding node_modules)

---

## Technology Stack

### Core Libraries
- **React 18.3.1** - UI library with hooks
- **React Router DOM 7.5.3** - Client-side routing
- **Styled-components 6.1.13** - CSS-in-JS styling
- **Framer Motion 11.18.2** - Animation library
- **Axios 1.9.0** - HTTP client
- **React Helmet Async 2.0.5** - SEO/meta tag management
- **React Scroll 1.9.0** - Smooth scrolling navigation
- **React Icons 5.3.0** - Icon library

### Build & Development Tools
- **Create React App** - Build tooling
- **Craco 7.1.0** - CRA configuration layer
- **ESLint 8.57.1** - Linting with import sorting
- **Prettier 3.5.3** - Code formatting
- **Babel** - JavaScript transpilation
- **Node 18** - Runtime environment

### Testing
- **Jest** - Test runner (via CRA)
- **React Testing Library** - Component testing
- **@testing-library/user-event** - User interaction testing

---

## Development Workflow

### Setup & Installation

```bash
# Clone the repository
git clone https://github.com/ryuu9505/my-portfolio.git
cd my-portfolio

# Install dependencies
npm install

# Start development server
npm start  # Runs on http://localhost:3000

# Build for production
npm run build

# Run tests
npm test
```

### Environment Variables

Create a `.env` file (or use existing):

```
REACT_APP_API_BASE_URL=https://api.unblind.kr
```

### Available Scripts

- `npm start` - Start development server (via Craco)
- `npm run build` - Production build
- `npm test` - Run test suite
- `npm run eject` - Eject from CRA (not recommended)

### Git Workflow

**Branch Naming:**
- Main branch: `main` (production)
- Feature branches: `claude/claude-md-{sessionId}`
- Always develop on the designated branch

**Commit Guidelines:**
- Use descriptive commit messages
- Follow conventional commits format
- Examples from recent history:
  - `feat: add google social login`
  - `fix: modify api server base url for social login`
  - `style: adjust user list gap`

---

## Code Conventions

### File Naming
- **Components:** PascalCase (e.g., `UserPage.js`, `ProfileCard.js`)
- **Hooks:** camelCase with `use` prefix (e.g., `useSearchOpen.js`)
- **Utils:** camelCase (e.g., `format.js`, `isEmpty.js`)
- **Styled components:** PascalCase (e.g., `HeaderContainer`, `CardWrapper`)

### Import Organization

**ESLint enforces import sorting:**

```javascript
// 1. External dependencies (alphabetically sorted)
import React from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

// 2. Internal imports with path aliases (alphabetically sorted)
import { getUser } from '@apis/Api';
import Card from '@components/Card';
import { useSearchOpen } from '@hooks/useSearchOpen';
import { colors, fontSizes } from '@styles/tokens';
import { formatDate } from '@utils/format';

// 3. Relative imports
import './styles.css';
```

**Rules:**
- Required newline after imports
- No duplicate imports
- External packages first, then internal imports

### Path Aliases

Use Craco-configured aliases for clean imports:

```javascript
// ✅ Good - Use aliases
import Card from '@components/Card';
import { getUser } from '@apis/Api';
import { colors } from '@styles/tokens';

// ❌ Bad - Relative paths
import Card from '../components/Card';
import { getUser } from '../../apis/Api';
```

**Available Aliases:**
- `@/` → `src/`
- `@apis` → `src/apis`
- `@assets` → `src/assets`
- `@components` → `src/components`
- `@hooks` → `src/hooks`
- `@layouts` → `src/layout`
- `@pages` → `src/pages`
- `@styles` → `src/styles`
- `@utils` → `src/utils`

### Code Style

**Prettier Configuration:**
```json
{
  "semi": true,           // Always use semicolons
  "singleQuote": true,    // Use single quotes
  "tabWidth": 2,          // 2-space indentation
  "trailingComma": "es5"  // Trailing commas where valid in ES5
}
```

**Best Practices:**
- Use functional components with hooks (no class components)
- Destructure props in function parameters
- Use arrow functions for callbacks
- Keep components small and focused (single responsibility)
- Extract reusable logic into custom hooks
- Prefer composition over prop drilling

---

## Styling System

### Hierarchical Design System

This project uses a **layered styling architecture** for maintainability and consistency. See `STYLE_GUIDE.md` for detailed documentation (in Korean).

```
styles/
├── tokens/              # Design values (colors, fonts, spacing)
├── primitives/          # Basic building blocks (Box, Button)
├── compositions/        # Feature-specific components (Card, Project)
├── layout/              # Layout-only styles (Header, Footer)
└── theme/               # Theme configuration
```

### 1. Tokens (Design System Foundation)

**Location:** `src/styles/tokens/`

**Files:**
- `colors.js` - Color palette
- `typography.js` - Fonts, sizes, weights
- `spacing.js` - Spacing scale, border radius
- `breakpoints.js` - Responsive breakpoints
- `index.js` - Unified exports

**Usage Example:**

```javascript
import { colors, fontSizes, breakpoints } from '@styles/tokens';

const Title = styled.h1`
  color: ${colors.primary};
  font-size: ${fontSizes.xl};

  @media (max-width: ${breakpoints.mobile}) {
    font-size: ${fontSizes.lg};
  }
`;
```

**Key Design Tokens:**
- **Colors:**
  - Primary: `#333333`
  - Secondary: `#646464`
  - Accent: `#4a90e2`
  - Background: `#FFFFFF`
  - Text: `#000000`
- **Font Sizes:** `xs` (0.6rem) to `3xl` (3rem)
- **Spacing:** `xs` (4px) to `4xl` (96px)
- **Breakpoints:**
  - Mobile: 480px
  - Tablet: 768px
  - Desktop: 992px
  - Wide: 1200px
- **Border Radius:** `sm` (4px) to `full` (999px)

### 2. Primitives (Basic Building Blocks)

**Location:** `src/styles/primitives/`

**Purpose:** Reusable, simple styled components with no business logic.

**Usage Example:**

```javascript
import { FlexContainer } from '@styles/primitives/Box.styles';
import { Button } from '@styles/primitives/Button.styles';

function MyComponent() {
  return (
    <FlexContainer direction="column" gap="20px">
      <Button variant="primary">Save</Button>
      <Button variant="secondary">Cancel</Button>
    </FlexContainer>
  );
}
```

### 3. Compositions (Domain-Specific Components)

**Location:** `src/styles/compositions/`

**Files:**
- `Card.styles.js` - Card variants (HistoryCard, CardList)
- `Project.styles.js` - Project cards and lists
- `Section.styles.js` - Section wrappers and titles
- `Skill.styles.js` - Skill card layouts
- `Film.styles.js` - Film carousel styles

**Usage Example:**

```javascript
import { ProjectList, ProjectCard } from '@styles/compositions/Project.styles';
import { SkillCardList } from '@styles/compositions/Skill.styles';

function UserPage() {
  return (
    <>
      <ProjectList>
        {projects.map(p => <ProjectCard key={p.id} {...p} />)}
      </ProjectList>
      <SkillCardList>
        {skills.map(s => <SkillCard key={s.id} {...s} />)}
      </SkillCardList>
    </>
  );
}
```

### 4. Component-Scoped Styles

**When to use:** Styles unique to a single component with no reuse potential.

```javascript
// Card.js
import styled from 'styled-components';

// Component-specific style
const StyledTechCard = styled.div`
  background-color: white;
  border-radius: 16px;
  /* ... */
`;

export const TechCard = ({ url, name, level }) => {
  return <StyledTechCard>...</StyledTechCard>;
};
```

### Styling Decision Tree

```
Q1: Is this a design value (color, spacing, font)?
  → YES: Add to tokens/

Q2: Is this a simple, reusable component (Grid, Flex, Button)?
  → YES: Add to primitives/

Q3: Is this domain-specific with business logic (ProjectCard, SkillList)?
  → YES: Add to compositions/

Q4: Is this used in only one component?
  → YES: Define inside the component file
```

### Anti-Patterns to Avoid

```javascript
// ❌ Bad - Hardcoded values
const Title = styled.h1`
  color: #333333;  // Use colors.primary
  margin: 20px;    // Use spacing.md

  @media (max-width: 480px) {  // Use breakpoints.mobile
    font-size: 1.2rem;
  }
`;

// ❌ Bad - Inline styles
<div style={{ display: 'flex', gap: '20px' }}>
  {/* Use FlexContainer instead */}
</div>

// ✅ Good - Use design system
import { colors, spacing, breakpoints } from '@styles/tokens';
import { FlexContainer } from '@styles/primitives/Box.styles';

const Title = styled.h1`
  color: ${colors.primary};
  margin: ${spacing.md};

  @media (max-width: ${breakpoints.mobile}) {
    font-size: ${fontSizes.lg};
  }
`;

<FlexContainer gap={spacing.md}>
  {/* ... */}
</FlexContainer>
```

---

## API Integration

### Configuration

**Base URL:** `https://api.unblind.kr` (from `.env`)

**HTTP Client:** Axios with credentials support

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL,
  withCredentials: true,  // Include cookies for session management
});
```

### Authentication Endpoints

**Location:** `src/apis/Login.js`

```javascript
// Login with credentials
POST /sessions
Body: { username: string, password: string }
Returns: User object

// Logout
DELETE /sessions
Returns: Success status

// Get current user
GET /me
Returns: User object or null

// Google OAuth
Redirect to: {API_BASE}/oauth2/authorization/google
```

### Data Endpoints

**Location:** `src/apis/Api.js`

```javascript
// User operations
GET /users/{id}                      // Get user by ID
GET /users/by-username/{username}    // Get user by username
GET /users/cursor?size={size}&cursor={cursor}  // Paginated list

// Career history
GET /careers?userId={id}             // Get user's career history

// Posts
GET /posts/{postId}                  // Get post details
```

### API Usage Patterns

**Authentication Context:**

```javascript
import { AuthProvider, useAuth } from '@components/AuthProvider';

function MyComponent() {
  const { user, login, logout, isLoading } = useAuth();

  const handleLogin = async (username, password) => {
    await login(username, password);
    // Navigate after successful login
  };

  return <div>{user ? `Hello ${user.username}` : 'Not logged in'}</div>;
}
```

**Fetching Data:**

```javascript
import { getUser, getUserByUsername, getCareers } from '@apis/Api';

// In component
useEffect(() => {
  const fetchData = async () => {
    try {
      const user = await getUserByUsername('john-doe');
      const careers = await getCareers(user.id);
      setUserData({ user, careers });
    } catch (error) {
      console.error('Failed to fetch user data:', error);
      // Handle error (show toast, redirect, etc.)
    }
  };

  fetchData();
}, []);
```

**Infinite Scroll Pagination:**

```javascript
const [users, setUsers] = useState([]);
const [cursor, setCursor] = useState(null);
const [hasMore, setHasMore] = useState(true);

const loadMore = async () => {
  try {
    const data = await getUsers({ size: 20, cursor });
    setUsers(prev => [...prev, ...data.content]);
    setCursor(data.nextCursor);
    setHasMore(data.hasNext);
  } catch (error) {
    console.error('Failed to load users:', error);
  }
};
```

### Error Handling

**Pattern:**

```javascript
try {
  const response = await api.get('/users/123');
  return response.data;
} catch (error) {
  if (error.response) {
    // Server responded with error status
    console.error('Server error:', error.response.status, error.response.data);
  } else if (error.request) {
    // No response received
    console.error('Network error:', error.message);
  } else {
    // Request setup error
    console.error('Error:', error.message);
  }
  throw error;  // Re-throw for caller to handle
}
```

---

## Routing & Navigation

### Route Configuration

**File:** `src/App.js`

```javascript
<Routes>
  <Route path="/" element={<Navigate to="/users" replace />} />
  <Route path="/login" element={<LoginPage />} />
  <Route path="/:username" element={<UserPage />} />
  <Route path="/users" element={<UserListPage />} />
  <Route path="/posts/:postId" element={<PostPage />} />
</Routes>
```

**Route Patterns:**
- `/` - Redirects to `/users`
- `/login` - Authentication page
- `/:username` - User profile (dynamic)
- `/users` - User listing with infinite scroll
- `/posts/:postId` - Post details (dynamic)

### Navigation Patterns

**Programmatic Navigation:**

```javascript
import { useNavigate } from 'react-router-dom';

function MyComponent() {
  const navigate = useNavigate();

  const goToProfile = (username) => {
    navigate(`/${username}`);
  };

  const goBack = () => {
    navigate(-1);
  };
}
```

**Smooth Scroll Navigation:**

```javascript
import { Link } from 'react-scroll';

<Link
  to="about"           // Section ID
  smooth={true}        // Smooth scrolling
  offset={-100}        // Account for fixed header
  duration={500}       // Animation duration
>
  About
</Link>
```

**Link Components:**

```javascript
import { Link } from 'react-router-dom';

<Link to="/users">All Users</Link>
<Link to={`/${username}`}>View Profile</Link>
```

---

## Common Patterns & Tasks

### Creating a New Page

1. **Create page component** in `src/pages/`:

```javascript
// src/pages/NewPage.js
import React, { useEffect, useState } from 'react';
import { FlexContainer } from '@styles/primitives/Box.styles';
import { colors, spacing } from '@styles/tokens';

export default function NewPage() {
  return (
    <FlexContainer direction="column" gap={spacing.lg}>
      <h1>New Page</h1>
      {/* Content */}
    </FlexContainer>
  );
}
```

2. **Add route** in `src/App.js`:

```javascript
import NewPage from '@pages/NewPage';

<Routes>
  {/* ... existing routes */}
  <Route path="/new-page" element={<NewPage />} />
</Routes>
```

3. **Add navigation** if needed in header or links.

### Creating a New Component

1. **Create component file** in `src/components/`:

```javascript
// src/components/MyComponent.js
import React from 'react';
import styled from 'styled-components';
import { colors, spacing } from '@styles/tokens';

const Wrapper = styled.div`
  padding: ${spacing.md};
  background: ${colors.background};
`;

export default function MyComponent({ title, children }) {
  return (
    <Wrapper>
      <h2>{title}</h2>
      {children}
    </Wrapper>
  );
}
```

2. **Use styled components** from primitives/compositions when possible.

3. **Import and use** in pages or other components:

```javascript
import MyComponent from '@components/MyComponent';

<MyComponent title="Hello">
  <p>Content here</p>
</MyComponent>
```

### Creating a Custom Hook

1. **Create hook file** in `src/hooks/`:

```javascript
// src/hooks/useMyHook.js
import { useState, useEffect } from 'react';

export function useMyHook(initialValue) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    // Side effects here
  }, [value]);

  return { value, setValue };
}
```

2. **Use in components**:

```javascript
import { useMyHook } from '@hooks/useMyHook';

function MyComponent() {
  const { value, setValue } = useMyHook('default');
  // ...
}
```

### Adding API Endpoints

1. **Add function** to `src/apis/Api.js`:

```javascript
export const getNewData = async (params) => {
  try {
    const response = await api.get('/new-endpoint', { params });
    return response.data;
  } catch (error) {
    console.error('Failed to fetch new data:', error);
    throw error;
  }
};
```

2. **Use in components** with error handling:

```javascript
import { getNewData } from '@apis/Api';

useEffect(() => {
  const fetchData = async () => {
    try {
      const data = await getNewData({ id: 123 });
      setData(data);
    } catch (error) {
      // Handle error
    }
  };
  fetchData();
}, []);
```

### Adding Animations

**Using Framer Motion:**

```javascript
import { motion } from 'framer-motion';

const variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

<motion.div
  variants={variants}
  initial="hidden"
  animate="visible"
  transition={{ duration: 0.5 }}
>
  Content
</motion.div>
```

**Scroll-triggered animations:**

```javascript
import { ScrollAnimation } from '@styles/AnimationStyles';

<ScrollAnimation>
  <YourComponent />
</ScrollAnimation>
```

### Adding Design Tokens

**Add to appropriate token file:**

```javascript
// src/styles/tokens/colors.js
export const colors = {
  // ... existing colors
  newColor: '#FF5733',
};

// src/styles/tokens/spacing.js
export const spacing = {
  // ... existing spacing
  xxl: '64px',
};
```

**Use in components:**

```javascript
import { colors, spacing } from '@styles/tokens';

const Styled = styled.div`
  color: ${colors.newColor};
  padding: ${spacing.xxl};
`;
```

---

## Testing & Quality Assurance

### Testing Setup

**Framework:** Jest + React Testing Library (configured via CRA)

**Configuration:** `src/setupTests.js`

```javascript
import '@testing-library/jest-dom';
```

### Running Tests

```bash
npm test           # Run test suite in watch mode
npm test -- --coverage   # With coverage report
```

### Writing Tests

**Example component test:**

```javascript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MyComponent from './MyComponent';

describe('MyComponent', () => {
  test('renders correctly', () => {
    render(<MyComponent title="Test" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  test('handles click events', async () => {
    const handleClick = jest.fn();
    render(<MyComponent onClick={handleClick} />);

    await userEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### Linting & Formatting

**Run linting:**

```bash
npx eslint src/**/*.js
```

**Auto-fix issues:**

```bash
npx eslint src/**/*.js --fix
```

**Format code:**

```bash
npx prettier --write "src/**/*.{js,jsx,json,css,md}"
```

**Format script:** `./format.sh` (if exists)

### Code Quality Checklist

Before committing:
- [ ] All imports are sorted correctly (ESLint enforces this)
- [ ] No console.log statements (except intentional logging)
- [ ] Components are properly formatted (Prettier)
- [ ] No unused variables or imports
- [ ] Design tokens used instead of hardcoded values
- [ ] Path aliases used instead of relative paths
- [ ] Proper error handling in API calls
- [ ] PropTypes or TypeScript types defined (if applicable)

---

## Deployment

### CI/CD Pipeline

**Platform:** GitHub Actions
**File:** `.github/workflows/deploy.yml`
**Trigger:** Push to `main` branch
**Environment:** GCP-APPLE (secrets-based)

### Deployment Steps

1. **Checkout repository** (actions/checkout@v4)
2. **Setup Node.js 18** with npm cache
3. **Cache dependencies** (node_modules, package-lock.json)
4. **Install dependencies** (`npm ci`)
5. **Build React app** (`npm run build`)
6. **Setup SSH key** (from GitHub Secrets)
7. **SSH into GCP instance:**
   - Remove old build files from `/var/www/react-app/`
   - Create directory with proper permissions
8. **Upload build files** via SCP
9. **Restart Nginx server**

### GitHub Secrets Required

- `INSTANCE_IP` - GCP instance IP address
- `USERNAME` - SSH username
- `SSH_PRIVATE_KEY` - SSH private key for authentication

### Server Configuration

**Web Server:** Nginx
**Document Root:** `/var/www/react-app/`
**Build Output:** `build/` directory uploaded to server

### Manual Deployment

If needed, deploy manually:

```bash
# Build locally
npm run build

# Upload to server (replace with actual credentials)
scp -r build/* username@server-ip:/var/www/react-app/

# SSH into server and restart Nginx
ssh username@server-ip
sudo systemctl restart nginx
```

### Build Optimization

**Build output includes:**
- Minified JavaScript bundles
- Optimized CSS
- Compressed assets
- Service worker (if PWA enabled)
- Source maps for debugging

**Build size considerations:**
- Use dynamic imports for code splitting if needed
- Optimize images before adding to public/
- Review bundle size with build analyzer if performance issues arise

---

## Important Files & Directories

### Configuration Files

| File | Purpose |
|------|---------|
| `craco.config.js` | Webpack path aliases configuration |
| `.eslintrc.json` | ESLint rules (import sorting, code quality) |
| `.prettierrc` | Code formatting rules |
| `jsconfig.json` | JavaScript IDE configuration (path aliases) |
| `.env` | Environment variables (API base URL) |
| `.gitignore` | Git ignore patterns |
| `package.json` | Dependencies and scripts |

### Documentation

| File | Purpose |
|------|---------|
| `README.md` | Project overview, setup instructions, live demo |
| `STYLE_GUIDE.md` | Detailed styling system guide (Korean) |
| `CLAUDE.md` | This file - AI assistant guide |

### Entry Points

| File | Purpose |
|------|---------|
| `public/index.html` | HTML entry point |
| `src/index.js` | JavaScript entry point |
| `src/App.js` | Root React component |

### Key Components

| File | Purpose |
|------|---------|
| `src/components/AuthProvider.js` | Authentication context provider |
| `src/components/header/Header.js` | Main header with navigation |
| `src/components/Card.js` | Various card components |
| `src/pages/UserPage.js` | Main profile page (complex) |
| `src/pages/UserListPage.js` | Infinite scroll listing |

### Styling

| Directory | Purpose |
|-----------|---------|
| `src/styles/tokens/` | Design system values |
| `src/styles/primitives/` | Basic styled components |
| `src/styles/compositions/` | Feature-specific styles |
| `src/styles/GlobalStyle.js` | Global CSS reset |

---

## AI Assistant Guidelines

### When Working on This Codebase

1. **Always read files before modifying them.** Never propose changes to code you haven't seen.

2. **Follow the established patterns:**
   - Use path aliases (`@components`, `@styles`, etc.)
   - Import design tokens instead of hardcoding values
   - Use primitives and compositions for styling
   - Follow import sorting rules (enforced by ESLint)

3. **Respect the styling hierarchy:**
   - Tokens → Primitives → Compositions → Component styles
   - Add new design values to tokens first
   - Create primitives for simple reusable components
   - Create compositions for domain-specific components
   - Only use component-scoped styles when truly unique

4. **Maintain code quality:**
   - Run Prettier before committing
   - Ensure ESLint rules pass
   - Add error handling to API calls
   - Use try-catch blocks appropriately
   - Provide user feedback for loading/error states

5. **Testing considerations:**
   - Write tests for new components (when test suite is active)
   - Test user interactions with React Testing Library
   - Mock API calls in tests
   - Test responsive behavior if applicable

6. **API integration:**
   - Always use the Axios instance from `@apis/Api.js`
   - Handle errors gracefully (network, server, client)
   - Use `withCredentials: true` for authenticated requests
   - Follow cursor-based pagination pattern for lists

7. **Performance:**
   - Use React.memo for expensive components if needed
   - Implement lazy loading for large lists (infinite scroll)
   - Optimize images before adding to public/
   - Use Framer Motion's viewport detection for scroll animations

8. **Accessibility:**
   - Use semantic HTML elements
   - Add proper ARIA labels where needed
   - Ensure keyboard navigation works
   - Maintain sufficient color contrast (check against tokens)

9. **SEO:**
   - Use React Helmet Async for meta tags
   - Add structured data (JSON-LD) for profile pages
   - Use semantic HTML and proper heading hierarchy
   - Generate sitemap.xml for public pages

10. **Git workflow:**
    - Develop on designated feature branch
    - Write descriptive commit messages
    - Follow conventional commits format
    - Don't push to main directly (uses CI/CD)

### Common Mistakes to Avoid

❌ **Don't:**
- Use relative imports instead of path aliases
- Hardcode colors, spacing, or breakpoints
- Create duplicate styled components across files
- Forget error handling in API calls
- Use inline styles (except for dynamic values)
- Commit directly to main branch
- Add large files or secrets to git
- Break the component-based architecture

✅ **Do:**
- Use path aliases for all imports
- Reference design tokens for all values
- Reuse primitives and compositions
- Handle API errors gracefully
- Use styled-components consistently
- Follow git workflow (feature branches)
- Keep components focused and small
- Maintain the established architecture

### Useful Commands for AI Assistants

```bash
# Search for component usage
grep -r "ComponentName" src/

# Find all styled components
grep -r "styled\." src/

# Find API call locations
grep -r "api\." src/

# List all pages
ls src/pages/

# List all components
ls src/components/

# Check import statements
grep -r "from '@" src/ | head -20

# Find TODO comments
grep -r "TODO" src/

# Check for console.log
grep -r "console.log" src/
```

### When Implementing New Features

1. **Understand the feature requirements** clearly
2. **Check existing similar features** for patterns
3. **Identify which components to modify or create**
4. **Plan the data flow** (API → State → UI)
5. **Design the UI** (which primitives/compositions to use)
6. **Implement incrementally:**
   - API integration first
   - Basic UI rendering
   - Styling and animations
   - Error handling and edge cases
   - Testing
7. **Test thoroughly** in development
8. **Commit with descriptive message**
9. **Create PR** if ready for review

### Getting Context

**Before making changes, gather context:**

```bash
# Understand component structure
cat src/components/ComponentName.js

# Check how APIs are called
cat src/apis/Api.js

# Review styling system
cat src/styles/tokens/colors.js
cat STYLE_GUIDE.md

# Check routing
cat src/App.js

# Review authentication flow
cat src/components/AuthProvider.js
```

### When Stuck

1. **Check documentation:**
   - README.md for project overview
   - STYLE_GUIDE.md for styling questions
   - This file (CLAUDE.md) for patterns

2. **Search codebase for examples:**
   - Find similar components
   - Check how APIs are used elsewhere
   - Look for similar styling patterns

3. **Review git history:**
   - See recent changes: `git log --oneline -10`
   - Check specific file history: `git log -- src/path/to/file.js`

4. **Ask clarifying questions** to the user if requirements are unclear.

---

## Additional Resources

### External Documentation

- **React:** https://react.dev/
- **React Router:** https://reactrouter.com/
- **Styled-components:** https://styled-components.com/
- **Framer Motion:** https://www.framer.com/motion/
- **Axios:** https://axios-http.com/
- **React Testing Library:** https://testing-library.com/react

### Project Links

- **Repository:** https://github.com/ryuu9505/my-portfolio
- **Live Demo:** https://hyeongjun.me
- **API Base:** https://api.unblind.kr

### Contact & Support

For questions or issues:
1. Check existing documentation (README, STYLE_GUIDE, this file)
2. Review git history for context
3. Search issues in the repository
4. Contact repository maintainer

---

## Changelog

### 2025-12-01
- Created CLAUDE.md with comprehensive codebase documentation
- Documented architecture, patterns, and conventions
- Added AI assistant guidelines and best practices

---

**End of CLAUDE.md**

This guide is maintained for AI assistants working on this codebase. Keep it updated as the project evolves.
