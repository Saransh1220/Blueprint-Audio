import { Component } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  email = '';
  password = '';

  onSubmit() {
    console.log('Login attempt:', this.email);
    // TODO: Implement actual login logic with Auth Service
  }

  loginWithGoogle() {
    console.log('Google login attempt');
    // TODO: Implement Google login
  }
}
