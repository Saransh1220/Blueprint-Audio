import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../components/header/header';
import { SpecRowComponent } from '../../components/spec-row/spec-row.component';
import { AuthService, User } from '../../services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, HeaderComponent, SpecRowComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit {
  currentUser = signal<User | null>(null);
  currentDate = signal<Date>(new Date());

  constructor(private authService: AuthService) {}

  ngOnInit() {
    // In a real app, we'd subscribe to the signal or observable.
    // Since AuthService uses a signal, we can just read it or use computed.
    // But for now, let's just set it from the service.
    this.currentUser.set(this.authService.currentUser());
  }
}
