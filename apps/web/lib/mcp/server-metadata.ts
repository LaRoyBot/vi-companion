export function resourceUrl(){
  const value=process.env.MCP_RESOURCE_URL;if(!value)throw new Error("Missing MCP_RESOURCE_URL");
  const url=new URL(value);if(url.protocol!=="https:"||url.pathname!=="/mcp"||url.search||url.hash)throw new Error("Invalid MCP resource URI");
  return url.toString().replace(/\/$/,"");
}
