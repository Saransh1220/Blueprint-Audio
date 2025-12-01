import { Injectable, signal } from "@angular/core";

export interface Toast {
	id: number;
	message: string;
	type: "success" | "error" | "info";
}

@Injectable({
	providedIn: "root",
})
export class ToastService {
	readonly toasts = signal<Toast[]>([]);
	private nextId = 0;

	show(
		message: string,
		type: "success" | "error" | "info" = "success",
		duration: number = 3000,
	) {
		const id = this.nextId++;
		const newToast: Toast = { id, message, type };

		this.toasts.update((toasts) => [...toasts, newToast]);

		setTimeout(() => {
			this.remove(id);
		}, duration);
	}

	remove(id: number) {
		this.toasts.update((toasts) => toasts.filter((t) => t.id !== id));
	}
}
