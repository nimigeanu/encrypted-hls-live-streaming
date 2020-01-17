# Live Streaming Platform with Copy Protection

## Highlights

* Fully working proof-of-concept complete with player webpage
* HLS AES encrypted streaming with key rotation
* Setup available for HTTP or HTTPS
* Easy to adapt to any CMS

## HTTP Setup

### Deploying for HTTP delivery

1. Sign in to the [AWS Management Console](https://aws.amazon.com/console), then click the button below to launch the CloudFormation template. Alternatively you can [download](template.yaml) the template and adjust it to your needs.

[![Launch Stack](https://cdn.rawgit.com/buildkite/cloudformation-launch-stack-button-svg/master/launch-stack.svg)](https://console.aws.amazon.com/cloudformation/home#/stacks/create/review?stackName=encrypted-hls&templateURL=https://lostshadow.s3.amazonaws.com/copy-protected-hls/template.yaml)

2. Choose your InstanceType; for testing just use the smallest (nano); otherwise, your bottleneck will be the network throughput, so choose that depending on how much you will need to stream (use figures [here](https://cloudonaut.io/ec2-network-performance-cheat-sheet/) as reference); you will be able to change the instance size later, or just discard the stack and create a new one with a different setup
3. Leave all other settings to default
4. Check the `I acknowledge that AWS CloudFormation might create IAM resources` box. This confirms you agree to have some required IAM roles and policies created by *CloudFormation*.
5. Hit the `Create Stack` button. 
6. Wait for the `Status` to become `CREATE_COMPLETE`. Note that this may take **1-2 minutes** or more.
7. Under `Outputs`, notice the keys named `IngressEndpoint` and `TestPlayerUrl`; write these down for using later

### Testing your HTTP delivery

1. Point your RTMP broadcaster (any of [these](https://support.google.com/youtube/answer/2907883) will work) to the rtmp `IngressEndpoint` output by CloudFormation above

	Note that, while some RTMP broadcasters require a simple URI, others (like [OBS Studio](https://obsproject.com)) require a **Server** and **Stream key**. In this case, split the URI above at the last *slash* character, as following:
	
	**Server**: `rtmp://[HOST]/live`  
	**Stream key**: `stream001`

	Also note that **the enpoint may not be ready** as soon as CloudFormation stack is complete; it may take a couple minutes more for the server software to be compiled, installed and started on the virtual server so be patient

2. Test the video playback by opening the above `TestPlayerUrl` in a browser
	
	Once again, node that this may not be available right away; resources do take time to get set up, especially on lower-end virtual server instances


## HTTPS Setup

### Deploying for HTTPS delivery

1. Sign in to the [AWS Management Console](https://aws.amazon.com/console), then click the button below to launch the CloudFormation template. Alternatively you can [download](template.yaml) the template and adjust it to your needs.

[![Launch Stack](https://cdn.rawgit.com/buildkite/cloudformation-launch-stack-button-svg/master/launch-stack.svg)](https://console.aws.amazon.com/cloudformation/home#/stacks/create/review?stackName=encrypted-hls&templateURL=https://lostshadow.s3.amazonaws.com/copy-protected-hls/template.yaml)

2. Choose your InstanceType; for testing just use the smallest (nano); otherwise, your bottleneck will be the network throughput, so choose that depending on how much you will need to stream (use figures [here](https://cloudonaut.io/ec2-network-performance-cheat-sheet/) as reference); you will be able to change the instance size later, or just discard the stack and create a new one with a different setup
3. Set `HTTPS` to `yes`
4. Paste the domain name you want to use for HTTPS under `HTTPSDomain` (e.g. `livestreaming.mydomain.com`)
5. Paste the SSL Certificate corresponding to above domain (in PEM format) under `SSLCertificate`; a correct certificate should begin with `-----BEGIN CERTIFICATE-----` and end with `-----END CERTIFICATE-----`
6. Paste the SSL Private Key corresponding to above certificate (in PEM format) under `SSLPrivateKey`; a correct key should begin with `-----BEGIN RSA PRIVATE KEY-----` and end with `-----END RSA PRIVATE KEY-----`

7. Check the `I acknowledge that AWS CloudFormation might create IAM resources` box. This confirms you agree to have some required IAM roles and policies created by *CloudFormation*.
8. Hit the `Create Stack` button. 
9. Wait for the `Status` to become `CREATE_COMPLETE`. Note that this may take **1-2 minutes** or more.
10. Under `Outputs`, follow the DNS setup note to set up the DNS record of the domain defined in step 4
11. Under `Outputs`, notice the keys named `SecureIngressEndpoint` and `SecureTestPlayerUrl`; write these down for using later

### Testing your HTTPS delivery

1. Point your RTMP broadcaster (any of [these](https://support.google.com/youtube/answer/2907883) will work) to the rtmp `SecureIngressEndpoint` output by CloudFormation above

	Note that, while some RTMP broadcasters require a simple URI, others (like [OBS Studio](https://obsproject.com)) require a **Server** and **Stream key**. In this case, split the URI above at the last *slash* character, as following:
	
	**Server**: `rtmp://[HOST]/live`  
	**Stream key**: `stream001`

	Also note that **the enpoint may not be ready** as soon as CloudFormation stack is complete; it may take a couple minutes more for the server software to be compiled, installed and started on the virtual server so be patient

2. Test the video playback by opening the above `SecureTestPlayerUrl` in a browser
	
	Once again, node that this may not be available right away; resources do take time to get set up, especially on lower-end virtual server instances

## Inner workings

* Proof-of-concept makes use of an AWS EC2 instance, on which it sets up 2 servers:
	* The **streaming server** - driven by Nginx-RTMP 
	* The **application server** - a simple Node.js deployment
* The 'streaming server' encrypts all HLS content; it then makes available both the encrypted video segments and the decryption keys, via separate channels
	* The encrypted video is made public for all to consume
	* The decryption keys are made available via a protected channel (in this case simply ip restricted) to only be accessed by the application server
* The HLS manifest includes a key retrieval URL that players must follow to download the decryption key, which is needed for proper playback; for the scope of this demo, the url points to the 'application server'
* The test video player is hosted on the 'application server'; the simple web page delivers the player configured with the HLS video link (pointing to the 'streaming server') and also sets up a unique 'session' that will be used to later validate the viewer
* Upon initialization in a browser, player will load the HLS (.m3u8) manifest, acknowledge the `#EXT-X-KEY` tag and attempt to load the key from the provided URI; as the request is made against the same domain (i.e. the 'application server') as the player page, the request should carry the aforementioned 'session'
* The key retrieval URL is driven by a simple script that verifies the user session; if valid, it will present the player with a valid decryption key, as retrieved from the 'streaming server' via the secure channel; otherwise it will return some other unusable form of 'gibberish' in the form of a short error message; anything but a valid key will result in the player failing to properly render the video

## Using a different player

The demo uses [Clappr](https://github.com/clappr/clappr). You are free to use any other player, choosing one is usually a matter of price, design, ease of integration and others. Options include Video.js, Hls.js, JWPlayer, TheoPlayer, FlowPlayer, Radiant, BitMovin.
Use the `StreamUrl` or `SecureStreamUrl` output by CloudFormation as the `src` (notation may vary) for your player.

## Running multiple live streams simultaneously

The test setup uses `stream001` as the stream name. You can replace that with any (URL safe) string, as long as it's consistent on both ingress and egress. This enables you to run multiple streams simultaneously simply by naming them differently.

## Streaming through a CDN

While it is important, in the context of this setup, for the keys to be distributed by the 'application server', the streaming payload (HLS segments) is viewer agnostic and can be proxied via any means. 

To set up CDN delivery do the following
* Define your CDN distribution with the `StreamingServerPublicDNS` or `SecureStreamingServerPublicDNS` (output by CloudFormation) as the origin
* In your `StreamUrl` or `SecureStreamUrl`, replace the ip/host and port combination with that of your CDN distribution

		http(s)://{DNS_domain_name}/hls/stream001.m3u8

	e.g. if the domain name of your DNS distribution is 'd13p55o7ap557v.cloudfront.net', your URL would be

		https://d13p55o7ap557v.cloudfront.net/hls/stream001.m3u8

## Setting up different ports

Demo uses a handful of ports for various needs, any of them can be altered to fit your needs:

* Player and key delivery over HTTP on port 80, defined in [index.js](assets/http/index.js#L9) and [nginx.conf](assets/http/nginx.conf#L21) (note that port 80 is unspecified since it is the default)
* Player and key delivery over HTTPS on port 443, defined in [index.js](assets/https/index.js#L12) and [nginx.conf](assets/https/nginx.conf#L21) (note that port 443 is unspecified since it is the default)
* Insecure HLS streaming over port 8080, defined in [index.html](assets/http/index.html#L12) and [nginx.conf](assets/http/nginx.conf#L43)
* Secure HLS streaming over port 8443, defined in [index.html](assets/https/index.html#L12) and [nginx.conf](assets/https/nginx.conf#L43)
* Private channel for server-to-server key exchange over port 8081, defined in [index.js](assets/http/index.js#L31) and [nginx.conf](assets/http/nginx.conf#L34)

## Running the 'streaming' and 'application' servers on different environments

The test run deploys the 2 servers on the same virtual machine for simplicity. To run them separately, the following is needed:

* Properly define and set up each, over either http or https (i.e. https://app.streamingexample.com and https://stream.streamingexample.com)
* Properly link to the set up 'streaming server' in the [player video urls](assets/https/index.html#L12)
* Properly link to the set up 'application server' in the [hls_key rtmp configuration](assets/https/nginx.conf#L21)
* Properly define the 'streaming server' for key retrieval by the 'application server' over the private channel [here](assets/https/index.js#L36) (i.e. replace '127.0.0.1' with the address of the streaming server as these are no longer on the same machine)
* Properly define the application server's IP as the authorized address to request the keys from the streaming server [here](assets/https/nginx.conf#L37) (i.e. replace '127.0.0.1' with the address of the application server as these are no longer on the same machine)

## Caching the decryption keys

Upon being requested a key, the 'application server' verifies the requester identity (i.e. the session) and if valid it will request the key from the 'streaming server' and forward it to the requester. This is inefficient as the respective key will always be the same and requesting it over and over is wasteful in terms of resource usage and roundtrip times. 

Although, for the sake of simplicity, this demo does not deal with the topic, it is recommended that for production setups keys be cached on the 'application server'.