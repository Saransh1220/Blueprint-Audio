import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  private authService = inject(AuthService);

  email = '';
  password = '';

  onSubmit() {
    this.authService
      .login({
        email: this.email,
        password: this.password,
      })
      .subscribe({
        error: (err) => {
          alert('Login failed: ' + (err.error?.error || 'Invalid credentials'));
        },
      });
  }

  loginWithGoogle() {
    console.log('Google login attempt');
    // TODO: Implement Google login
  }
}
