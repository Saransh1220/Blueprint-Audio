import { Injectable, inject, signal } from "@angular/core";
import { Router } from "@angular/router";

export interface User {
	id: string;
	email: string;
	name: string;
	role: "artist" | "producer";
}

@Injectable({
	providedIn: "root",
})
export class AuthService {
	private router = inject(Router);

	currentUser = signal<User | null>(null);

	login(email: string, role: "artist" | "producer" = "artist") {
		// Mock login
		this.currentUser.set({
			id: "123",
			email,
			name: email.split("@")[0],
			role,
		});
		this.router.navigate(["/dashboard"]);
	}

	register(data: {
		email: string;
		username: string;
		role: "artist" | "producer";
	}) {
		// Mock register
		this.currentUser.set({
			id: "123",
			email: data.email,
			name: data.username,
			role: data.role,
		});
		this.router.navigate(["/dashboard"]);
	}

	logout() {
		this.currentUser.set(null);
		this.router.navigate(["/login"]);
	}
}
