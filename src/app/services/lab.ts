import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Spec } from '../models/spec';
import { MusicalKey, Genre } from '../models/enums';

@Injectable({
  providedIn: 'root',
})
export class LabService {
  private specs: Spec[] = [
    {
      id: '#9092A',
      type: 'WAV',
      category: 'beat',
      imageUrl:
        'https://images.unsplash.com/photo-1619983081563-430f63602796?q=80&w=1000&auto=format&fit=crop',
      title: 'Neon_Glitch',
      bpm: 140,
      key: MusicalKey.C_SHARP_MINOR,
      tags: [Genre.TECH, 'DARK'],
      price: 29.99,
    },
    {
      id: '#102BB',
      type: 'MP3/WAV',
      category: 'beat',
      imageUrl:
        'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1000&auto=format&fit=crop',
      title: 'Deep_Orbit',
      bpm: 124,
      key: MusicalKey.A_MAJOR,
      tags: [Genre.HOUSE, 'SPACE'],
      price: 29.99,
    },
    {
      id: '#8821X',
      type: 'STEMS',
      category: 'beat',
      imageUrl:
        'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1000&auto=format&fit=crop',
      title: 'Red_Protocol',
      bpm: 150,
      key: MusicalKey.D_MINOR,
      tags: [Genre.DRILL, 'HARD'],
      price: 49.99,
    },
    {
      id: '#003AA',
      type: 'WAV',
      category: 'beat',
      imageUrl:
        'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=1000&auto=format&fit=crop',
      title: 'Analog_Soul',
      bpm: 90,
      key: MusicalKey.F_SHARP_MAJOR,
      tags: [Genre.RNB, 'VINTAGE'],
      price: 29.99,
    },
    // SAMPLES
    {
      id: '#SMPL1',
      type: 'PACK',
      category: 'sample',
      imageUrl:
        'https://images.unsplash.com/photo-1516280440614-6697288d5d38?q=80&w=1000&auto=format&fit=crop',
      title: 'Cyber_Drums_Vol1',
      bpm: 140,
      key: MusicalKey.C_MINOR,
      tags: [Genre.TECH, 'DRUMS'],
      price: 19.99,
    },
    {
      id: '#SMPL2',
      type: 'LOOPS',
      category: 'sample',
      imageUrl:
        'https://images.unsplash.com/photo-1511379938547-c1f69419868d?q=80&w=1000&auto=format&fit=crop',
      title: 'Synth_Textures',
      bpm: 120,
      key: MusicalKey.G_MINOR,
      tags: [Genre.AMBIENT, 'SYNTH', 'LOOPS'],
      price: 24.99,
    },
    {
      id: '#BT005',
      type: 'WAV',
      category: 'beat',
      imageUrl:
        'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?q=80&w=1000&auto=format&fit=crop',
      title: 'Night_Rider',
      bpm: 130,
      key: MusicalKey.C_MINOR,
      tags: [Genre.TRAP, 'DARK'],
      price: 34.99,
    },
    {
      id: '#SMPL3',
      type: 'LOOPS',
      category: 'sample',
      imageUrl:
        'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=1000&auto=format&fit=crop',
      title: 'Vinyl_Cuts',
      bpm: 95,
      key: MusicalKey.A_MINOR,
      tags: [Genre.HIPHOP, 'LOOPS', 'VINTAGE'],
      price: 14.99,
    },
  ];

  constructor() { }

  getSpecs(category?: 'beat' | 'sample'): Observable<Spec[]> {
    if (category) {
      return of(this.specs.filter((s) => s.category === category));
    }
    return of(this.specs);
  }
}
