# Code Block Protection

This tests that code blocks are preserved.

## JSX in code block

```jsx
<Component prop={value} />
<div>
  {items.map(i => <Item key={i} />)}
</div>
```

## Inline code

Use `<Component />` for rendering and `{props.value}` for accessing.

## Table with code

| Code | Description |
|------|-------------|
| `<div>` | HTML div element |
| `{value}` | JSX expression |

## Special chars in code block

```bash
if [ $x < 10 ]; then
  echo "{value} is less than 10"
fi
```

