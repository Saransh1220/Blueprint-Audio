import { Injectable, signal } from "@angular/core";
import type { Spec } from "../models/spec";

@Injectable({
	providedIn: "root",
})
export class PlayerService {
	public isVisible = signal(false);
	public currentTrack = signal<Spec | null>(null);

	showPlayer(track: Spec) {
		this.currentTrack.set(track);
		this.isVisible.set(true);
	}

	hidePlayer() {
		this.isVisible.set(false);
		this.currentTrack.set(null);
	}
}
