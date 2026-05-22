import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CoinRepository } from '../../../core/services/coin.repository';
import { UserPreferencesService } from '../../../core/services/user-preferences.service';
import { WatchlistService } from '../../../core/services/watchlist.service';
import { AuthService } from '../../../core/services/auth.service';
import { DEFAULT_PREFERENCES } from '../../../core/models/coin.model';
import { filterAndSortCoins } from '../../../core/utils/coin-filters';
import { CoinCardComponent } from '../coin-card/coin-card.component';

@Component({
  selector: 'app-coin-list',
  standalone: true,
  imports: [CoinCardComponent],
  templateUrl: './coin-list.component.html',
  styleUrl: './coin-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoinListComponent {
  private readonly coinsRepo = inject(CoinRepository);
  private readonly prefsService = inject(UserPreferencesService);
  private readonly watchlistService = inject(WatchlistService);
  readonly auth = inject(AuthService);

  private readonly rawCoins = toSignal(this.coinsRepo.watchCoins(), { initialValue: [] });
  private readonly preferences = toSignal(this.prefsService.watchPreferences(), {
    initialValue: DEFAULT_PREFERENCES,
  });
  readonly watchlist = toSignal(this.watchlistService.watchWatchlist(), {
    initialValue: new Set<string>(),
  });

  readonly sortedCoins = computed(() =>
    filterAndSortCoins(this.rawCoins(), this.preferences()),
  );

  readonly lastSyncedLabel = computed(() => {
    const coins = this.rawCoins();
    if (!coins.length) return null;
    const latest = coins.reduce((max, c) => {
      const sec = c.lastSyncedAt?.seconds ?? 0;
      return sec > max ? sec : max;
    }, 0);
    if (!latest) return null;
    const mins = Math.round((Date.now() / 1000 - latest) / 60);
    return mins < 1 ? 'just now' : `${mins} min ago`;
  });

  async toggleWatch(coinId: string): Promise<void> {
    if (!this.auth.isAuthenticated()) return;
    const set = this.watchlist();
    await this.watchlistService.toggle(coinId, set.has(coinId));
  }
}
