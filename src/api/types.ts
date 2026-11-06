import type { components } from './schema';

type S = components['schemas'];

export type FundPayload = S['FundPayload'];
export type FundSummary = S['FundSummary'];
export type FundRole = S['Role'];
export type User = S['User'];
export type SessionResponse = S['SessionResponse'];
export type SessionInfo = S['SessionInfo'];
export type InviteInfo = S['InviteInfo'];
export type FundPatch = S['FundPatch'];
export type ContributionInput = S['ContributionInput'];

export type Item = FundPayload['items'][number];
export type Contribution = FundPayload['contributions'][number];
export type Sharing = NonNullable<FundPayload['sharing']>;
