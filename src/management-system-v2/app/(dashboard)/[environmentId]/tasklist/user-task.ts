const defaultHtml = `<form class="form"><div id="i3jcu"><b id="i4m1">My default form</b></div>
<img id="inmmd" src="https://images.unsplash.com/photo-1498049860654-af1a5c566876?w=600&q=80"/>
<div class="if91m">Here is an example form you can use directly or edit to your own liking.
  <div draggable="true" id="inxs7-2">The image above is from an external source. If you wish to deploy this user task on an offline engine,</div>
  <div draggable="true" id="inxs7-2-2">please make sure to either delete or replace it with a local image.</div>
  <div draggable="true" id="inxs7-2-3">All the changes you make in this form are being saved automatically</div>
  <div draggable="true" id="inxs7-2-4">You can choose from a variety of blocks or write your own custom code, style your elements, etc.</div>
</div>
<button type="submit" class="button">Submit</button>
</form>`;

const defaultCss = `button {
  padding: 10px 15px;
  text-align: center;
  display: inline-block;
  font-size: 16px;
  border-radius: 6px;
  margin: 10px;
  color: white;
  border: 0px;
  background-color: #1976d2;
  font-family: Verdana;
}
.if91m{
  padding-top:10px;
  padding-right:10px;
  padding-bottom:10px;
  padding-left:10px;
  font-weight:400;
  font-size:0.85em;
  color:rgb(0, 0, 0);
  font-family:Lucida Sans Unicode, Lucida Grande, sans-serif;
}
#inmmd{
  color:black;
  width:231px;
  height:139px;
  padding:0 0 0 0;
  margin:0 0 0 10px;
  border-radius:5px;
  border: 1px solid #1976d2;
}
#i3jcu{
  padding-top:10px;
  padding-right:10px;
  padding-bottom:10px;
  padding-left:10px;
}
#i4m1{
  font-family:Lucida Sans Unicode, Lucida Grande, sans-serif;
  font-size:18px;
  text-shadow:1px 0 1px #1976d2;
}`;

const defaultTask = `<html><head><style>${defaultCss}</style></head> <body>${defaultHtml}</body> </html>`;

export default defaultTask;
