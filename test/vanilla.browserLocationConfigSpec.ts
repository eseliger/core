import { UIRouter } from "../src/router";
import { UrlService } from "../src/url/urlService";
import * as vanilla from "../src/vanilla";
import { UrlMatcherFactory } from "../src/url/urlMatcherFactory";
import { BrowserLocationConfig } from '../src/vanilla';
import { resetBrowserUrl } from './_testUtils';

describe('BrowserLocationConfig implementation', () => {
  afterAll(() => resetBrowserUrl())

  let router: UIRouter;
  let $url: UrlService;
  let $umf: UrlMatcherFactory;

  let mockHistory, mockLocation;

  // Replace the history and location
  function mockPushState(_router) {
    let plugin: any = _router.getPlugin('vanilla.pushStateLocation');

    mockHistory = {
      replaceState: (a, b, url) => mockLocation.href = url,
      pushState: (a, b, url) => mockLocation.href = url,
    };

    mockLocation = {
      _href: "/",
      pathname: "/",
      search: "",
      get href() {
        return this._href;
      },
      set href(val) {
        this._href = val;
        let [pathname, search] = val.split("?");
        this.pathname = pathname;
        this.search = search ? "?" + search : "";
      },
    };

    plugin.service._history = mockHistory;
    plugin.service._location = mockLocation;

    return plugin.service;
  }

  beforeEach(() => {
    router = new UIRouter();
    router.plugin(vanilla.servicesPlugin);
    router.plugin(vanilla.pushStateLocationPlugin);
    $umf = router.urlMatcherFactory;
    $url = router.urlService;

    router.stateRegistry.register({
      url: '/path/:urlParam?queryParam',
      name: 'path',
    });
  });

  it('uses history.pushState when setting a url', () => {
    let service = mockPushState(router);
    expect(router.urlService.config.html5Mode()).toBe(true);
    let stub = spyOn(service._history, 'pushState');
    router.urlRouter.push($umf.compile('/hello/:name'), { name: 'world' }, {});
    expect(stub.calls.first().args[2]).toBe('/hello/world');
  });

  it('uses history.replaceState when setting a url with replace', () => {
    let service = mockPushState(router);
    let stub = spyOn(service._history, 'replaceState');
    router.urlRouter.push($umf.compile('/hello/:name'), { name: 'world' }, { replace: true });
    expect(stub.calls.first().args[2]).toBe('/hello/world');
  });

  it('returns the correct url query', async(done) => {
    mockPushState(router);

    expect(router.urlService.config.html5Mode()).toBe(true);

    await router.stateService.go('path', { urlParam: 'bar' });

    expect(mockLocation.href.includes('/path/bar')).toBe(true);
    expect(mockLocation.href.includes('#')).toBe(false);

    expect($url.path()).toBe('/path/bar');
    expect($url.search()).toEqual({});

    await router.stateService.go('path', { urlParam: 'bar', queryParam: 'query' });

    expect(mockLocation.href.includes('/path/bar?queryParam=query')).toBe(true);
    expect(mockLocation.href.includes('#')).toBe(false);

    expect($url.path()).toBe('/path/bar');
    expect($url.search()).toEqual({ queryParam: 'query' });
    expect($url.search()).toEqual({ queryParam: 'query' });

    done();
  });

  it('returns URL portions from the location object', () => {
    const blc = new BrowserLocationConfig();

    expect(blc.host()).toBe(location.hostname);
    expect(blc.port()).toBe(parseInt(location.port, 10));
    expect(blc.protocol() + ":").toBe(location.protocol);
  });
});
