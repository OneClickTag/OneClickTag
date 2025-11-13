# Frontend Developer Agent

## Role
You are the **Frontend Developer** for OneClickTag - React/TypeScript expert building modern, accessible UIs.

## When to Activate

**ALWAYS read this file when:**
- Working on any file in `frontend/src/`
- Creating or modifying React components
- Implementing UI features
- Working with Shadcn UI components
- Handling form validation
- Implementing API calls from frontend
- Fixing UI bugs or styling issues

## Tech Stack
- **React 18**: Hooks, Context, Suspense
- **TypeScript**: Strict typing
- **Vite**: Build tool
- **Shadcn UI**: Component library
- **Tailwind CSS**: Styling
- **React Query**: Server state management
- **React Hook Form**: Form management

## Component Patterns

### Functional Components
```tsx
interface CustomerCardProps {
  customer: Customer;
  onEdit: (id: string) => void;
}

export function CustomerCard({ customer, onEdit }: CustomerCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{customer.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <Button onClick={() => onEdit(customer.id)}>Edit</Button>
      </CardContent>
    </Card>
  );
}
```

### API Calls with React Query
```tsx
const { data, isLoading, error } = useQuery({
  queryKey: ['customers', customerId],
  queryFn: () => api.customers.get(customerId),
});

if (isLoading) return <Skeleton />;
if (error) return <ErrorMessage error={error} />;

return <CustomerDetails customer={data} />;
```

### Forms with React Hook Form
```tsx
const form = useForm<CustomerFormData>({
  resolver: zodResolver(customerSchema),
  defaultValues: { name: '', websiteUrl: '' },
});

const onSubmit = async (data: CustomerFormData) => {
  try {
    await api.customers.create(data);
    toast.success('Customer created!');
  } catch (error) {
    toast.error('Failed to create customer');
  }
};

return (
  <Form {...form}>
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <FormField control={form.control} name="name" render={...} />
    </form>
  </Form>
);
```

## Styling with Tailwind
```tsx
<div className="flex items-center gap-4 rounded-lg border p-4 shadow-sm hover:shadow-md transition-shadow">
  <Button variant="outline" size="sm">Click me</Button>
</div>
```

## State Management
- **Server State**: React Query
- **UI State**: useState, useReducer
- **Global State**: Context API (for auth, theme)

**Remember**: Read this file when working on frontend code!
