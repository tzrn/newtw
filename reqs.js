const loading='<span class="my-16 mx-auto">loading...</span>';
const error  =`<p class="mx-auto my-32 text-3xl flex flex-row">Error
<button class="ml-2" onclick="reload()">
<svg class="w-8 fill-primary" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
	<path d="M15,6V1.76l-1.7,1.7A7,7,0,1,0,14.92,9H13.51a5.63,5.63,0,1,1-1.2-4.55L10.76,6Z"/>
</svg>
</button></p>`;

const clientid=window.localStorage.uid;
linkprefix=window.localStorage.android=="1"?"":"vlc://";

if(!window.localStorage.follows)window.localStorage.follows='';
follows=window.localStorage.follows.split(',').filter(f=>f!='');

async function request(body)
{
	return fetch("https://gql.twitch.tv/gql", {
		"headers": {"client-id": clientid}, 
		"body":body,
		"method": "POST"});
}

function get_vods(channel) 
{ //unless someone streams more that 2 times a day on avarage we dont need more than 60
  return request("{\"opvideoerationName\":\"FilterableVideoTower_Videos\",\"variables\":{\"limit\":60,\"channelOwnerLogin\":\""+
  channel+
  "\",\"broadcastType\":\"ARCHIVE\",\"videoSort\":\"TIME\"},\"extensions\":{\"persistedQuery\":{\"version\":1,\"sha256Hash\":\"072ae0f19038145cdf1bbe51c83be73fa15ab553483509a8bb65589f6b9ca279\"}}}");
}

function get_live_tags(tags,sort)
{
	sort_types=['VIEWER_COUNT','VIEWER_COUNT_ASC','RECENT','RELEVANCE']; //relevance doesnt work
																		 //probably because i stripped headers
	tags=tags.filter(t=>t!='');
	tags.map((tag,i)=>{tags[i]=`"${tag}"`});
	tags=tags.join(',');

	return request("{\"operationName\":\"BrowsePage_Popular\",\"variables\":{\"imageWidth\":50,\"limit\":30,\"platformType\":\"all\",\"options\":{\"sort\":\""+sort_types[sort]+"\",\"freeformTags\":["+tags+"],\"tags\":[],\"recommendationsContext\":{\"platform\":\"web\"},\"broadcasterLanguages\":[]},\"sortTypeIsRecency\":false},\"extensions\":{\"persistedQuery\":{\"version\":1,\"sha256Hash\":\"8ee167e2915b2a005921862a6a133f0ba71d2b7d5f804fc885883ad9eed2ffd3\"}}}");
}

function channel_info_req(channel)
{
	return `{"operationName":"StreamMetadata","variables":{"channelLogin":"${channel}"},"extensions":{"persistedQuery":{"version":1,"sha256Hash":"252a46e3f5b1ddc431b396e688331d8d020daec27079893ac7d4e6db759a7402"}}}`;
}

//these are similar but why waste effort refactoring
async function get_playback_token(vodid)
{
	return (await (await request("{\"operationName\":\"PlaybackAccessToken\",\"variables\":{\"isLive\":false,\"login\":\"\",\"isVod\":true,\"vodID\":\""+vodid+"\",\"playerType\":\"popout\"},\"extensions\":{\"persistedQuery\":{\"version\":1,\"sha256Hash\":\"3093517e37e4f4cb48906155bcd894150aef92617939236d2508f3375ab732ce\"}}}")).json()).data.videoPlaybackAccessToken;
}

async function get_live_playback_token(channel)
{
	return (await (await request("{\"operationName\":\"PlaybackAccessToken\",\"variables\":{\"isLive\":true,\"login\":\""+channel+"\",\"isVod\":false,\"vodID\":\"\",\"playerType\":\"popout\"},\"extensions\":{\"persistedQuery\":{\"version\":1,\"sha256Hash\":\"3093517e37e4f4cb48906155bcd894150aef92617939236d2508f3375ab732ce\"}}}")).json()).data.streamPlaybackAccessToken;
}

async function get_live_m3u8(channel)
{
	token=await get_live_playback_token(channel);
	return `https://usher.ttvnw.net/api/channel/hls/${channel}.m3u8?acmb=e30%3D&allow_source=true&browser_family=chrome&browser_version=119.0&cdm=wv&fast_bread=true&os_name=Linux&os_version=undefined&p=2982847&platform=web&play_session_id=${clientid}&player_backend=mediaplayer&player_version=1.24.0-rc.1.3&playlist_include_framerate=true&reassignments_supported=true&sig=${token.signature}&supported_codecs=av1,h264&token=${encodeURIComponent(token.value)}&transcode_mode=cbr_v1`;
} 

async function get_m3u8_link(vodid)
{
	access=await get_playback_token(vodid);
	return `https://usher.ttvnw.net/vod/${vodid}.m3u8?acmb=e30%3D&allow_source=true&browser_family=chrome&browser_version=119.0&cdm=wv&os_name=Linux&os_version=undefined&p=1297330&platform=web&play_session_id=${clientid}&player_backend=mediaplayer&player_version=1.24.0-rc.1.3&playlist_include_framerate=true&reassignments_supported=true&sig=${access.signature}&supported_codecs=av1,h264&token=${encodeURIComponent(access.value)}&transcode_mode=cbr_v1`;
}

async function play_live(element,channel)
{
	before=element.innerHTML;
	element.innerHTML="loading...";
	window.open(`${linkprefix}${await get_live_m3u8(channel)}`);
	element.innerHTML=before;
}

function reload()
{
	window.location=window.location;
}

function add_new_follow(channel) //todo: don't allow adding duplicates
{
	follows.push(channel.toLowerCase());
	window.localStorage.follows=follows;
	reload();
}

function prettydate(date)
{
	date=new Date(date);
	return `${date.toDateString()} - ${date.toLocaleTimeString()}`;
}