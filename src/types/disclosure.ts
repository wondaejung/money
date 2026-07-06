export interface Disclosure {
  symbol: string;
  corpName: string;
  reportName: string;
  rceptNo: string;
  receiptDate: string;
  submitter: string;
  important: boolean;
}

export interface DisclosureApiResponse {
  disclosures: Disclosure[];
  configured: boolean;
  fetchedAt: string;
  error?: string;
}
