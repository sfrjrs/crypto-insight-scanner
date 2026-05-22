import { DecimalPipe, UpperCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map, switchMap } from 'rxjs';
import { CoinRepository } from '../../../core/services/coin.repository';
import { WatchlistService } from '../../../core/services/watchlist.service';
import { AuthService } from '../../../core/services/auth.service';
import { CompactNumberPipe } from '../../../shared/pipes/compact-number.pipe';
import { PercentChangePipe } from '../../../shared/pipes/percent-change.pipe';
import { CATEGORY_LABELS } from '../../../core/config/allowed-categories';

@Component({
  selector: 'app-coin-detail',
  standalone: true,
  imports: [RouterLink, DecimalPipe, UpperCasePipe, CompactNumberPipe, PercentChangePipe],
  templateUrl: './coin-detail.component.html',
  styleUrl: './coin-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoinDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly coinsRepo = inject(CoinRepository);
  private readonly watchlistService = inject(WatchlistService);
  readonly auth = inject(AuthService);
  readonly categoryLabels = CATEGORY_LABELS;

  readonly coin = toSignal(
    this.route.paramMap.pipe(
      map((p) => p.get('id') ?? ''),
      switchMap((id) => this.coinsRepo.watchCoin(id)),
    ),
    { initialValue: undefined },
  );

  readonly watchlist = toSignal(this.watchlistService.watchWatchlist(), {
    initialValue: new Set<string>(),
  });

  breakdownEntries(coin: { scoreBreakdown: Record<string, number> }): { key: string; value: number }[] {
    return Object.entries(coin.scoreBreakdown).map(([key, value]) => ({ key, value }));
  }

  categoryLabel(id: string): string {
    return this.categoryLabels[id] ?? id;
  }

  async toggleWatch(coinId: string): Promise<void> {
    const set = this.watchlist();
    await this.watchlistService.toggle(coinId, set.has(coinId));
  }
}
