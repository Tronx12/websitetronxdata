export type ApiResult<T = any> = T;

export async function api<T = any>(action:string, data?:Record<string, any>):Promise<T> {
  const res = await fetch("/api/apps-script", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({action,data}),
  });
  const json = await res.json();
  if (!res.ok || json?.error) throw new Error(json?.error || "Request failed");
  return json.data as T;
}
