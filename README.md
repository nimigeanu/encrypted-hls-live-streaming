# Live Streaming Platform with Copy Protection

## Highlights

* Fully working proof-of-concept complete with player webpage
* HLS AES encrycpted streaming with key rotation
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
* Upon initialization in a browser, player will load the HLS (.m3u8) manifest, acknowledge the xxxx tag and attempt to load the key from the respective URL; as the request is made against the same domain (i.e. the 'application server') as the player page, the request should carry the afforementioned 'session'
* The key retrieval URL is driven by a simple script that verifies the user session; if valid, it will present the player with a valid decryption key, as retrieved from the 'streaming server' via the secure channel; otherwise it will return some other unusable form of 'gibberish' in the form of a short error message; anything but a valid key will result in the player failing to properly render the video
