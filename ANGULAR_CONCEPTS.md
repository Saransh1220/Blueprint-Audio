# Angular Concepts in Red Wave App

This document explains the core Angular concepts used in this application, focusing on modern best practices like Signals, Standalone Components, and the latest bootstrapping methods.

## 1. Bootstrapping (Application Startup)

In modern Angular (v15+), we use **Standalone APIs** to bootstrap the application, removing the need for `AppModule`.

### How it works in `main.ts`

The entry point of the application is `src/main.ts`. Instead of `platformBrowserDynamic().bootstrapModule(AppModule)`, we use `bootstrapApplication`.

```typescript
// src/main.ts
bootstrapApplication(AppComponent, {
  providers: [
    provideZoneChangeDetection(), // Optimizes change detection
    provideAnimations(),          // Enables Angular animations
    provideRouter(                // Sets up routing
      routes,
      withInMemoryScrolling({ scrollPositionRestoration: 'top' }),
    ),
  ],
}).catch((err) => console.error(err));
```

**Key Concepts:**

- **`bootstrapApplication`**: Starts the app with a standalone root component (`AppComponent`).
- **`providers`**: Global services and configuration (Router, Animations, etc.) are passed here directly.

---

## 2. Signals & State Management

**Signals** are the new standard for reactive state in Angular. They provide fine-grained reactivity, meaning Angular knows exactly *what* changed and updates only that part of the DOM.

### Example: `ThemeService`

We use Signals to manage the application's theme (Light/Dark).

```typescript
// src/app/services/theme.service.ts
@Injectable({ providedIn: 'root' })
export class ThemeService {
  // 1. Define a Signal
  public currentTheme = signal<string>('light'); 

  constructor() {
    // 2. Use an Effect to react to changes
    effect(() => {
      const theme = this.currentTheme(); // Reading the signal registers a dependency
      
      // This code runs automatically whenever `currentTheme` changes
      if (theme === 'dark') {
        document.body.classList.add('dark-theme');
      } else {
        document.body.classList.remove('dark-theme');
      }
      localStorage.setItem('app-theme', theme);
    });
  }

  toggleTheme() {
    // 3. Update the Signal
    this.currentTheme.update((current) => (current === 'light' ? 'dark' : 'light'));
  }
}
```

**Key Concepts:**

- **`signal(initialValue)`**: Creates a writable signal.
- **`signal()`**: Reads the current value (e.g., `this.currentTheme()`).
- **`update(fn)`**: Updates the value based on the current value.
- **`set(value)`**: Sets a new value directly.
- **`effect(fn)`**: Runs code whenever signals read inside it change.

---

## 3. Data Flow (Service to Component)

Data flows from **Services** (State) to **Components** (UI). Components consume Signals, and the UI updates automatically.

### Architecture Diagram

```mermaid
graph TD
    User[User Interaction] -->|Click Toggle| Component[ThemeToggleComponent]
    Component -->|Call Method| Service[ThemeService]
    Service -->|Update Signal| Signal[currentTheme Signal]
    Signal -->|Trigger Effect| Effect[Effect()]
    Effect -->|Update DOM| DOM[Body Class / LocalStorage]
    Signal -->|Auto-Update| UI[UI Bindings]
```

### Component Implementation

The component injects the service and exposes it to the template.

```typescript
// src/app/components/theme-toggle/theme-toggle.ts
@Component({
  selector: 'app-theme-toggle',
  standalone: true, // No NgModule needed
  templateUrl: './theme-toggle.html',
  // ...
})
export class ThemeToggleComponent {
  // New `inject` syntax instead of constructor injection
  themeService = inject(ThemeService); 
}
```

```html
<!-- src/app/components/theme-toggle/theme-toggle.html -->
<button (click)="themeService.toggleTheme()">
  <!-- Read the signal value directly in the template -->
  @if (themeService.currentTheme() === 'dark') {
    <i class="icon-moon"></i>
  } @else {
    <i class="icon-sun"></i>
  }
</button>
```

---

## 4. Forms (Template-Driven)

This project uses **Template-Driven Forms** for simple scenarios like Login. This approach relies on directives like `ngModel` in the template.

### Example: `LoginComponent`

```typescript
// src/app/pages/auth/login/login.component.ts
@Component({
  standalone: true,
  imports: [FormsModule, RouterLink], // Must import FormsModule
  // ...
})
export class LoginComponent {
  email = '';
  password = '';

  onSubmit() {
    console.log('Login:', this.email, this.password);
  }
}
```

```html
<!-- src/app/pages/auth/login/login.component.html -->
<form (ngSubmit)="onSubmit()">
  <div class="form-group">
    <label>Email</label>
    <!-- Two-way binding with [(ngModel)] -->
    <input
      type="email"
      [(ngModel)]="email" 
      name="email"
      required
    />
  </div>
  <button type="submit">Sign In</button>
</form>
```

**Key Concepts:**

- **`[(ngModel)]`**: "Banana in a box" syntax for two-way data binding. Updates the component property when input changes, and updates input when property changes.
- **`(ngSubmit)`**: Event fired when the form is submitted.
- **`name` attribute**: Required for `ngModel` to work inside a `<form>`.

### Reactive Forms (Alternative)

For more complex forms, we would use **Reactive Forms** (`FormControl`, `FormGroup`).
*Note: This project currently uses Template-Driven forms for Auth, which is simpler for basic inputs.*

---

## 5. Modern Best Practices Used

### A. Standalone Components

Every component in this app is `standalone: true`.

- **Benefit**: No need to declare components in `AppModule`. Imports are explicit per component.

### B. Control Flow Syntax (`@if`, `@for`)

We use the new built-in control flow instead of `*ngIf` and `*ngFor`.

**Old:**

```html
<div *ngIf="isLoggedIn">Welcome</div>
```

**New (Used Here):**

```html
@if (isLoggedIn) {
  <div>Welcome</div>
}
```

### C. Dependency Injection with `inject()`

Instead of constructor injection:

```typescript
constructor(private themeService: ThemeService) {}
```

We use:

```typescript
themeService = inject(ThemeService);
```

- **Benefit**: Cleaner, type-safe, and works outside classes (e.g., in functional guards).

---

## Summary of Data Flow

1. **Bootstrapping**: `main.ts` starts the app with global providers.
2. **State**: `ThemeService` holds state in `signals`.
3. **Interaction**: `ThemeToggleComponent` calls service methods.
4. **Reactivity**: Signals update, triggering `effects` (side effects like DOM changes) and auto-updating templates.
