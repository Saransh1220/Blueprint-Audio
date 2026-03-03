import {
  CreateOrderRequest,
  GetLicenseDownloadsRequest,
  GetOrderRequest,
  GetProducerOrdersRequest,
  GetUserLicensesRequest,
  GetUserOrdersRequest,
  VerifyPaymentRequest,
} from './payment.requests';

describe('payment requests', () => {
  it('creates fixed-path requests', () => {
    expect(new CreateOrderRequest({ spec_id: 's1', license_option_id: 'l1' }).path).toBe('/orders');
    expect(new VerifyPaymentRequest({} as never).path).toBe('/payments/verify');
  });

  it('creates path requests with ids', () => {
    expect(new GetOrderRequest('o1').path).toBe('/orders/o1');
    expect(new GetLicenseDownloadsRequest('l1').path).toBe('/licenses/l1/downloads');
  });

  it('sets optional query params for user orders/licenses', () => {
    const ordersReq = new GetUserOrdersRequest({ page: 2 });
    const licensesReq = new GetUserLicensesRequest({ page: 3, q: 'trap', type: 'Basic' });

    expect(ordersReq.params?.get('page')).toBe('2');
    expect(licensesReq.params?.get('page')).toBe('3');
    expect(licensesReq.params?.get('q')).toBe('trap');
    expect(licensesReq.params?.get('type')).toBe('Basic');
  });

  it('does not set params when optional query inputs are empty', () => {
    const ordersReq = new GetUserOrdersRequest();
    const ordersReqEmpty = new GetUserOrdersRequest({});
    const licensesReqNoArg = new GetUserLicensesRequest();
    const licensesReq = new GetUserLicensesRequest({ page: 0, q: '', type: '' });

    expect(ordersReq.params).toBeUndefined();
    expect(ordersReqEmpty.params?.keys().length).toBe(0);
    expect(licensesReqNoArg.params).toBeUndefined();
    expect(licensesReq.params?.keys().length).toBe(0);
  });

  it('sets producer order paging query param', () => {
    const req = new GetProducerOrdersRequest(4, 25);
    expect(req.path).toBe('/orders/producer');
    expect(req.method).toBe('GET');
    expect(req.params?.get('page')).toBe('4');
    expect(req.params?.get('limit')).toBe('25');
  });
});
