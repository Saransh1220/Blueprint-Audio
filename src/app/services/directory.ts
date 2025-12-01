import { Injectable } from "@angular/core";
import { type Observable, of } from "rxjs";
import type { Producer } from "../models/producer";

@Injectable({
	providedIn: "root",
})
export class DirectoryService {
	private producers: Producer[] = [
		{
			name: "ALEX_TERMINAL",
			specialty: "Industrial / Techno",
			avatarUrl:
				"https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1000&auto=format&fit=crop",
		},
		{
			name: "SARAH_SYNTH",
			specialty: "Neo-Soul / Pop",
			avatarUrl:
				"https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=1000&auto=format&fit=crop",
		},
	];

	getProducers(): Observable<Producer[]> {
		return of(this.producers);
	}
}
