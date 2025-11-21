import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Spec } from '../models/spec';

@Injectable({
  providedIn: 'root',
})
export class LabService {
  private specs: Spec[] = [
    {
      id: '#9092A',
      type: 'WAV',
      imageUrl:
        'https://images.unsplash.com/photo-1619983081563-430f63602796?q=80&w=1000&auto=format&fit=crop',
      title: 'Neon_Glitch',
      bpm: 140,
      key: 'C# MINOR',
      tags: ['TECH', 'DARK'],
      price: 29.99,
    },
    {
      id: '#102BB',
      type: 'MP3/WAV',
      imageUrl:
        'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1000&auto=format&fit=crop',
      title: 'Deep_Orbit',
      bpm: 124,
      key: 'A MAJOR',
      tags: ['HOUSE', 'SPACE'],
      price: 29.99,
    },
    {
      id: '#8821X',
      type: 'STEMS',
      imageUrl:
        'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1000&auto=format&fit=crop',
      title: 'Red_Protocol',
      bpm: 150,
      key: 'D MINOR',
      tags: ['DRILL', 'HARD'],
      price: 49.99,
    },
    {
      id: '#003AA',
      type: 'WAV',
      imageUrl:
        'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=1000&auto=format&fit=crop',
      title: 'Analog_Soul',
      bpm: 90,
      key: 'F# MAJOR',
      tags: ['R&B', 'VINTAGE'],
      price: 29.99,
    },
  ];

  constructor() {}

  getSpecs(): Observable<Spec[]> {
    return of(this.specs);
  }
}
