# Code Highlighting Test

This file tests various programming languages for syntax highlighting.

## JavaScript

```javascript
function greet(name) {
  const message = `Hello, ${name}!`;
  console.log(message);
  return message;
}

const users = ['Alice', 'Bob', 'Charlie'];
users.forEach(user => greet(user));
```

## TypeScript

```typescript
interface User {
  id: number;
  name: string;
  email?: string;
}

async function fetchUser(id: number): Promise<User> {
  const response = await fetch(`/api/users/${id}`);
  return response.json();
}
```

## Python

```python
from typing import List, Optional

def fibonacci(n: int) -> List[int]:
    """Generate Fibonacci sequence up to n terms."""
    if n <= 0:
        return []
    
    sequence = [0, 1]
    for _ in range(n - 2):
        sequence.append(sequence[-1] + sequence[-2])
    
    return sequence[:n]
```

## Rust

```rust
fn main() {
    let numbers: Vec<i32> = (1..=10).collect();
    
    let sum: i32 = numbers.iter()
        .filter(|&n| n % 2 == 0)
        .sum();
    
    println!("Sum of even numbers: {}", sum);
}
```

## Go

```go
package main

import "fmt"

func main() {
    messages := make(chan string, 2)
    messages <- "Hello"
    messages <- "World"
    
    fmt.Println(<-messages)
    fmt.Println(<-messages)
}
```

## SQL

```sql
SELECT 
    u.name,
    COUNT(o.id) as order_count,
    SUM(o.total) as total_spent
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.created_at >= '2024-01-01'
GROUP BY u.id
HAVING COUNT(o.id) > 0
ORDER BY total_spent DESC;
```

## Shell/Bash

```bash
#!/bin/bash

# Deploy script
set -e

echo "Starting deployment..."
git pull origin main
npm install
npm run build
pm2 restart app

echo "Deployment complete!"
```

## JSON

```json
{
  "name": "example-project",
  "version": "1.0.0",
  "dependencies": {
    "react": "^18.0.0",
    "typescript": "^5.0.0"
  }
}
```

## YAML

```yaml
version: '3.8'
services:
  web:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    depends_on:
      - db
  db:
    image: postgres:14
    volumes:
      - db_data:/var/lib/postgresql/data
```

## CSS

```css
.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.button {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 8px;
  padding: 0.75rem 1.5rem;
  color: white;
  transition: transform 0.2s ease;
}

.button:hover {
  transform: translateY(-2px);
}
```

## HTML

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Example Page</title>
</head>
<body>
  <header>
    <nav>
      <a href="/">Home</a>
      <a href="/about">About</a>
    </nav>
  </header>
  <main>
    <h1>Welcome</h1>
  </main>
</body>
</html>
```

