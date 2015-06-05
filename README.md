# MyServerDashboard
Aggregated stats with local cacheing


# Nginx configuration
You have to add Access-Control to your png files (cross domain policy)

`
    location /munin {
      root /var/www;
      location ~* \.(png)$ {
        if ($request_method = 'OPTIONS') {
          add_header 'Access-Control-Allow-Origin' '*';
          add_header 'Access-Control-Allow-Credentials' 'true';
          add_header 'Access-Control-Allow-Methods' 'GET, OPTIONS';
          add_header 'Access-Control-Allow-Headers' 'DNT,X-Mx-ReqToken,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Authorization';
          add_header 'Access-Control-Max-Age' 1728000;
          add_header 'Content-Type' 'text/plain charset=UTF-8';
          add_header 'Content-Length' 0;
          return 204;
        }
        if ($request_method = 'GET') {
          add_header 'Access-Control-Allow-Origin' '*';
          add_header 'Access-Control-Allow-Credentials' 'true';
          add_header 'Access-Control-Allow-Methods' 'GET, OPTIONS';
          add_header 'Access-Control-Allow-Headers' 'DNT,X-Mx-ReqToken,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Authorization';
        }
      }
    }
`
