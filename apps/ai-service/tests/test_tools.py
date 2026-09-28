
import pytest
from fastapi.testclient import TestClient
from app.main import app, execute_tool, tools

DATA = {"inventory": [{"name":"VIP", "quantity":80, "quantity_sold":64, "quantity_reserved":2}], "orders":[{"status":"paid","total_cents":1000,"refunded_cents":100,"created_at":"2026-09-01T00:00:00Z"}], "checkins":4,"waitlist":[{"email":"private@example.com"}],"event":{"title":"Forum","organizer_id":"secret-tenant"}}

def test_inventory_subtracts_reservations():
    assert execute_tool("get_ticket_inventory", DATA, [])[0]["available"] == 14

def test_revenue_subtracts_refunds():
    assert execute_tool("get_revenue_stats", DATA, [])["net_cents"] == 900

def test_waitlist_excludes_pii():
    assert execute_tool("get_waitlist", DATA, []) == {"count":1}

def test_no_model_supplied_tenant_or_sql():
    assert all(t["parameters"]["properties"] == {} for t in tools())
    with pytest.raises(ValueError):
        execute_tool("execute_sql", DATA, [])

def test_health():
    assert TestClient(app).get('/health').json()['status'] == 'ok'

def test_missing_configuration_fails_closed(monkeypatch):
    monkeypatch.delenv('SUPABASE_URL',raising=False)
    response=TestClient(app).post('/chat',json={"event_id":"20000000-0000-4000-8000-000000000001","message":"How many?"})
    assert response.status_code == 503

def test_rejects_bad_event_uuid():
    assert TestClient(app).post('/chat',json={"event_id":"not-a-uuid","message":"hi"}).status_code == 422

def test_no_organizer_identifier_in_summary():
    assert 'organizer_id' not in execute_tool('get_event_stats',DATA,[])['event']

@pytest.mark.parametrize('status,expected',[(401,401),(200,403)])
def test_authentication_and_event_authorization(monkeypatch,status,expected):
    import app.main as main
    import httpx
    monkeypatch.setenv('SUPABASE_URL','https://example.supabase.co')
    monkeypatch.setenv('SUPABASE_ANON_KEY','public-key')
    original=httpx.AsyncClient
    def respond(request):
        if request.url.path=='/auth/v1/user':
            return httpx.Response(status,json={'id':'user'} if status==200 else {})
        return httpx.Response(403,json={'error':'forbidden'})
    monkeypatch.setattr(main.httpx,'AsyncClient',lambda **kw: original(transport=httpx.MockTransport(respond)))
    response=TestClient(app).post('/chat',headers={'Authorization':'Bearer token'},json={'event_id':'20000000-0000-4000-8000-000000000001','message':'hi'})
    assert response.status_code==expected

@pytest.mark.parametrize('bad_arguments',[False,True])
def test_responses_tool_loop_and_argument_guard(monkeypatch,bad_arguments):
    import app.main as main
    from types import SimpleNamespace
    async def allow(*args):
        return {**DATA,'documents':[]}, {}
    monkeypatch.setattr(main,'authorized',allow)
    monkeypatch.setenv('OPENAI_API_KEY','test-only')
    calls=[]
    class FakeAI:
        def __init__(self,**kw):
            self.responses=self
        async def create(self,**kw):
            calls.append(kw)
            assert kw['store'] is False
            if len(calls)==1:
                return SimpleNamespace(output=[SimpleNamespace(type='function_call',name='get_ticket_inventory',arguments='{"event_id":"other"}' if bad_arguments else '{}',call_id='call_1')])
            return SimpleNamespace(output=[],output_text='14 VIP tickets remain.')
        async def close(self):
            pass
    monkeypatch.setattr(main,'AsyncOpenAI',FakeAI)
    response=TestClient(app).post('/chat',json={'event_id':'20000000-0000-4000-8000-000000000001','message':'VIP remaining?'})
    if bad_arguments:
        assert response.status_code==502
    else:
        assert response.status_code==200
        assert response.json()['tool']=='get_ticket_inventory'
        assert '14' in calls[1]['input'][-1]['output']
