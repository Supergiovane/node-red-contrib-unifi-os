module.exports = function(RED)
{
    const https = require('https');
    const cookie = require('cookie');

    /**
     * The Cookie Monster node
     * 
     * @param {Object} config
     * @returns {void}
     */
    function CookieMonster(config) 
    {
        RED.nodes.createNode(this, config);
        var node = this;

        /**
         * This node's input handler
         * 
         * @param {Object} msg The imcoming payload
         * @returns {void}
         */
        node.on('input', function(msg) 
        {
            // Build the HTTPS request for Unifi OS
            node.status({fill:"yellow",shape:"dot",text:"connecting"})
            const url = 'https://' + config.controllerIp + '/api/auth/login';
            const post_data = JSON.stringify({
                username: config.username,
                password: config.pass
            });

            // Request options
            const options = {
                method: 'POST',
                rejectUnauthorized: false,
                keepAlive: true,
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(post_data)
                }
            };

            // Send login to Unifi, if successful, cookies will be returned in response
            const request = https.request(url, options, (response) =>
            {
                response.on('data', (body) =>
                {
                    // Debug message with full response
                    node.warn({headers: response.headers, payload: JSON.parse(body), status: response.statusCode});
                    node.warn({cookieSet: response.headers['set-cookie']});
                    node.status({fill:"green",shape:"dot",text:"connected"});
                    // If successful - save the important cookies for use in other nodes
                    if (response.statusCode == 200)
                    {
                        // Parsed cookie:
                        // TEMPORARY - this is for compatibility with http request core node.
                        
                        if (response.headers.hasOwnProperty('set-cookie'))
                        {
                            node.send({responseCookies: extractCookies(response.headers['set-cookie']), setCookie: response.headers['set-cookie']});
                        }
                    }
                    else
                    {
                        node.status({fill:"red",shape:"ring",text:"connection failed"});
                        node.warn(response.statusCode);
                    }
                });
            });
            
            // Catch login errors
            request.on('error', (e) =>
            {
                node.warn(e);
            });

            // Include post data
            request.write(post_data);

            // Close request
            request.end();
        });

        // Temp function for cookies in JSON
        function extractCookies(setCookie) {
            var cookies = {};
            setCookie.forEach(function(c) {
                var parsedCookie = cookie.parse(c);
                var eq_idx = c.indexOf('=');
                var key = c.substr(0, eq_idx).trim()
                parsedCookie.value = parsedCookie[key];
                delete parsedCookie[key];
                cookies[key] = parsedCookie;
            });
            return cookies;
        }
    }

    // Register the CookieMonster node
    RED.nodes.registerType("cookie-monster", CookieMonster);
}
