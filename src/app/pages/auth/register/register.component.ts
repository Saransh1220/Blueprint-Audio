import { Component, inject } from '@angular/core'; // Trigger rebuild
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
})
export class RegisterComponent {
  private authService = inject(AuthService);

  username = '';
  displayName = '';
  email = '';
  password = '';
  confirmPassword = '';
  role: 'artist' | 'producer' = 'artist';

  onSubmit() {
    if (this.password !== this.confirmPassword) {
      alert('PASSCODES DO NOT MATCH');
      return;
    }

    this.authService
      .register({
        email: this.email,
        password: this.password,
        name: this.username,
        display_name: this.displayName || undefined,
        role: this.role,
      })
      .subscribe({
        error: (err) => {
          alert('Registration failed: ' + (err.error?.error || 'Unknown error'));
        },
      });
  }
}
