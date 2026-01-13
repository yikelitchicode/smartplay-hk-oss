# Headless UI Components

A collection of headless UI components built with Base UI React, fully accessible and customizable with Tailwind CSS.

## Installation

The components use `@base-ui/react` which is already installed in your project.

## Usage

Import components from the `ui` directory:

```tsx
import { Button, Input, Modal } from '@/components/ui';
```

## Components

### Button

A versatile button component with variants, sizes, and loading state.

```tsx
import { Button } from '@/components/ui';

<Button variant="primary" size="md">
  Click me
</Button>

<Button variant="secondary" loading>
  Loading...
</Button>

<Button variant="danger" startIcon={<Icon />}>
  Delete
</Button>
```

**Props:**
- `variant`: 'primary' | 'secondary' | 'ghost' | 'danger'
- `size`: 'sm' | 'md' | 'lg'
- `loading`: boolean
- `startIcon`: React.ReactNode
- `endIcon`: React.ReactNode

---

### Input

A text input with label, error handling, and helper text.

```tsx
import { Input } from '@/components/ui';

<Input
  label="Email"
  type="email"
  placeholder="Enter your email"
  error={errors.email}
  helperText="We'll never share your email"
  fullWidth
/>
```

**Props:**
- `label`: string
- `error`: string
- `helperText`: string
- `startIcon`: React.ReactNode
- `endIcon`: React.ReactNode
- `fullWidth`: boolean
- `size`: 'sm' | 'md' | 'lg'

---

### Textarea

A multi-line text input with the same features as Input.

```tsx
import { Textarea } from '@/components/ui';

<Textarea
  label="Message"
  placeholder="Enter your message"
  rows={5}
  resize="vertical"
/>
```

**Props:**
- `label`: string
- `error`: string
- `helperText`: string
- `fullWidth`: boolean
- `resize`: 'none' | 'both' | 'horizontal' | 'vertical'
- `rows`: number

---

### Modal

A dialog/modal component with accessibility features.

```tsx
import { Modal } from '@/components/ui';

function Example() {
  const [open, setOpen] = useState(false);

  return (
    <Modal
      open={open}
      onClose={() => setOpen(false)}
      title="Confirm Action"
      description="Are you sure you want to proceed?"
      size="md"
    >
      <p>Modal content goes here...</p>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button variant="primary">Confirm</Button>
      </div>
    </Modal>
  );
}
```

**Props:**
- `open`: boolean
- `onClose`: () => void
- `title`: string
- `description`: string
- `size`: 'sm' | 'md' | 'lg' | 'xl' | 'full'
- `showCloseButton`: boolean
- `closeOnEscape`: boolean
- `closeOnOutsideClick`: boolean

---

### Select

A dropdown select component with keyboard navigation.

```tsx
import { Select } from '@/components/ui';

const options = [
  { value: 'option1', label: 'Option 1' },
  { value: 'option2', label: 'Option 2' },
  { value: 'option3', label: 'Option 3', disabled: true },
];

<Select
  label="Choose an option"
  options={options}
  value={value}
  onChange={setValue}
  placeholder="Select..."
  required
/>
```

**Props:**
- `label`: string
- `options`: SelectOption[]
- `value`: string
- `onChange`: (value: string) => void
- `placeholder`: string
- `error`: string
- `helperText`: string
- `disabled`: boolean
- `required`: boolean
- `size`: 'sm' | 'md' | 'lg'

---

### Checkbox

A checkbox component with label and error handling.

```tsx
import { Checkbox } from '@/components/ui';

<Checkbox
  label="Accept terms and conditions"
  checked={checked}
  onChange={(e) => setChecked(e.target.checked)}
  helperText="You must accept to continue"
/>
```

**Props:**
- `label`: string
- `error`: string
- `helperText`: string
- `size`: 'sm' | 'md' | 'lg'
- `indeterminate`: boolean

---

### Switch

A toggle switch component for binary choices.

```tsx
import { Switch } from '@/components/ui';

<Switch
  label="Enable notifications"
  description="Receive email notifications"
  checked={enabled}
  onChange={(e) => setEnabled(e.target.checked)}
/>
```

**Props:**
- `label`: string
- `description`: string
- `error`: string
- `size`: 'sm' | 'md' | 'lg'

---

### Tooltip

A tooltip component for additional information.

```tsx
import { Tooltip } from '@/components/ui';

<Tooltip content="This is a tooltip" placement="top">
  <button>Hover me</button>
</Tooltip>
```

**Props:**
- `content`: React.ReactNode
- `children`: React.ReactNode
- `placement`: 'top' | 'bottom' | 'left' | 'right'
- `delay`: number (default: 500ms)
- `arrow`: boolean
- `disabled`: boolean

---

### Alert

An alert component for notifications and messages.

```tsx
import { Alert } from '@/components/ui';

<Alert variant="success" title="Success!">
  Your changes have been saved.
</Alert>

<Alert variant="error" title="Error!" onClose={() => {}}>
  Something went wrong.
</Alert>
```

**Props:**
- `variant`: 'info' | 'success' | 'warning' | 'error'
- `title`: string
- `onClose`: () => void
- `icon`: React.ReactNode

---

### Badge

A badge component for labels and status indicators.

```tsx
import { Badge } from '@/components/ui';

<Badge variant="success">Active</Badge>
<Badge variant="error" dot>
  3 notifications
</Badge>
```

**Props:**
- `variant`: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'
- `size`: 'sm' | 'md' | 'lg'
- `dot`: boolean

---

### Progress

A progress bar component with label support.

```tsx
import { Progress } from '@/components/ui';

<Progress value={75} max={100} showLabel label="Loading..." />

<Progress value={50} variant="success" size="lg" />
```

**Props:**
- `value`: number (default: 0)
- `max`: number (default: 100)
- `size`: 'sm' | 'md' | 'lg'
- `variant`: 'default' | 'primary' | 'success' | 'warning' | 'error'
- `showLabel`: boolean
- `label`: string

---

## Accessibility

All components are built with accessibility in mind:
- Proper ARIA attributes
- Keyboard navigation support
- Focus management
- Screen reader support

## Customization

Components use Tailwind CSS classes for styling. You can customize them by:
1. Modifying the component files directly
2. Using the `className` prop to add custom styles
3. Extending components with additional props

## Examples

### Form Example

```tsx
import { Button, Input, Checkbox } from '@/components/ui';

function LoginForm() {
  const [data, setData] = useState({ email: '', remember: false });

  return (
    <form onSubmit={handleSubmit}>
      <Input
        label="Email"
        type="email"
        value={data.email}
        onChange={(e) => setData({ ...data, email: e.target.value })}
        fullWidth
      />
      <Checkbox
        label="Remember me"
        checked={data.remember}
        onChange={(e) => setData({ ...data, remember: e.target.checked })}
      />
      <Button type="submit" variant="primary" fullWidth>
        Login
      </Button>
    </form>
  );
}
```

### Modal Example

```tsx
import { Modal, Button, Input } from '@/components/ui';

function CreateUserModal({ open, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title="Create User">
      <div className="space-y-4">
        <Input label="Name" placeholder="Enter name" fullWidth />
        <Input label="Email" type="email" placeholder="Enter email" fullWidth />
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary">Create</Button>
      </div>
    </Modal>
  );
}
```

## License

MIT
