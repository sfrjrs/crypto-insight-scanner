import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CoinGeckoMarket {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  total_volume: number;
  price_change_percentage_24h_in_currency?: number;
  price_change_percentage_7d_in_currency?: number;
  price_change_percentage_30d_in_currency?: number;
}

export interface CoinGeckoDetail {
  id: string;
  symbol: string;
  name: string;
  description?: { en?: string };
  categories?: string[];
  image?: { large?: string };
  sentiment_votes_up_percentage?: number;
  community_data?: {
    sentiment_votes_up_percentage?: number;
  };
  developer_data?: {
    pull_request_contributors?: number;
    commit_count_4_weeks?: number;
    stars?: number;
  };
  market_data?: {
    current_price?: { usd?: number };
    market_cap?: { usd?: number };
    total_volume?: { usd?: number };
    price_change_percentage_24h?: number;
    price_change_percentage_7d?: number;
    price_change_percentage_30d?: number;
  };
  links?: { coingecko_url?: string };
}

export function developerScoreFromDetail(detail: CoinGeckoDetail): number {
  const dev = detail.developer_data;
  if (!dev) return 0;
  const contributors = dev.pull_request_contributors ?? 0;
  const commits = dev.commit_count_4_weeks ?? 0;
  const stars = dev.stars ?? 0;
  const raw = contributors * 2 + commits * 0.5 + Math.log10(stars + 1) * 10;
  return Math.min(100, Math.round(raw));
}

const BASE_URL = 'https://api.coingecko.com/api/v3';

@Injectable({ providedIn: 'root' })
export class CoinGeckoService {
  private readonly http = inject(HttpClient);

  fetchMarketsByCategory(category: string, perPage = 50): Observable<CoinGeckoMarket[]> {
    const params = new HttpParams()
      .set('vs_currency', 'usd')
      .set('category', category)
      .set('order', 'market_cap_desc')
      .set('per_page', perPage)
      .set('page', 1)
      .set('sparkline', 'false')
      .set('price_change_percentage', '24h,7d,30d');

    return this.http.get<CoinGeckoMarket[]>(`${BASE_URL}/coins/markets`, { params });
  }

  fetchCoinDetail(id: string): Observable<CoinGeckoDetail> {
    const params = new HttpParams()
      .set('localization', 'false')
      .set('tickers', 'false')
      .set('market_data', 'true')
      .set('community_data', 'true')
      .set('developer_data', 'true')
      .set('sparkline', 'false');

    return this.http.get<CoinGeckoDetail>(`${BASE_URL}/coins/${id}`, { params });
  }
}
