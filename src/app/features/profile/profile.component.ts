import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { UserPreferencesService } from '../../core/services/user-preferences.service';
import { CoinRepository } from '../../core/services/coin.repository';
import { WatchlistService } from '../../core/services/watchlist.service';
import {
  DEFAULT_PREFERENCES,
  RiskTolerance,
  SortBy,
  UserPreferences,
} from '../../core/models/coin.model';
import { ALLOWED_CATEGORY_IDS, CATEGORY_LABELS } from '../../core/config/allowed-categories';
import { filterAndSortCoins } from '../../core/utils/coin-filters';
import { CompactNumberPipe } from '../../shared/pipes/compact-number.pipe';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [FormsModule, RouterLink, CompactNumberPipe],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileComponent {
  private readonly auth = inject(AuthService);
  private readonly prefsService = inject(UserPreferencesService);
  private readonly coinsRepo = inject(CoinRepository);
  private readonly watchlistService = inject(WatchlistService);

  readonly categoryOptions = ALLOWED_CATEGORY_IDS.map((id) => ({
    id,
    label: CATEGORY_LABELS[id] ?? id,
  }));

  private readonly remotePrefs = toSignal(this.prefsService.watchPreferences(), {
    initialValue: DEFAULT_PREFERENCES,
  });
  readonly watchlistIds = toSignal(this.watchlistService.watchWatchlist(), {
    initialValue: new Set<string>(),
  });
  private readonly allCoins = toSignal(this.coinsRepo.watchCoins(), { initialValue: [] });

  readonly prefs = signal<UserPreferences>({ ...DEFAULT_PREFERENCES, enabledCategories: [...ALLOWED_CATEGORY_IDS] });
  readonly saveStatus = signal<'idle' | 'saving' | 'saved'>('idle');

  readonly watchlistCoins = () => {
    const ids = this.watchlistIds();
    const coins = filterAndSortCoins(this.allCoins(), this.prefs());
    return coins.filter((c) => ids.has(c.id));
  };

  constructor() {
    effect(() => {
      const remote = this.remotePrefs();
      this.prefs.set({ ...remote });
    });

    effect(() => {
      if (this.auth.uid()) {
        void this.prefsService.ensureDefaults();
      }
    });
  }

  isCategoryEnabled(id: string): boolean {
    const enabled = this.prefs().enabledCategories;
    return enabled.length === 0 || enabled.includes(id);
  }

  toggleCategory(id: string): void {
    const current = this.prefs();
    let enabled = [...current.enabledCategories];
    if (enabled.length === 0) {
      enabled = [...ALLOWED_CATEGORY_IDS];
    }
    if (enabled.includes(id)) {
      enabled = enabled.filter((c) => c !== id);
    } else {
      enabled.push(id);
    }
    this.prefs.set({ ...current, enabledCategories: enabled });
  }

  async savePreferences(): Promise<void> {
    this.saveStatus.set('saving');
    await this.prefsService.savePreferences(this.prefs());
    this.saveStatus.set('saved');
    setTimeout(() => this.saveStatus.set('idle'), 2000);
  }

  updateRisk(value: RiskTolerance): void {
    this.prefs.update((p) => ({ ...p, riskTolerance: value }));
  }

  updateSort(value: SortBy): void {
    this.prefs.update((p) => ({ ...p, sortBy: value }));
  }

  updateMinCap(value: number): void {
    this.prefs.update((p) => ({ ...p, minMarketCapUsd: value }));
  }
}
