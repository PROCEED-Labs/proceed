export const defaultHtml = `<form class="form"><div id="i3jcu"><b id="i4m1">My default form</b></div>
<img id="inmmd" src="https://images.unsplash.com/photo-1498049860654-af1a5c566876?w=600&q=80"/>
<div class="if91m">Here is an example form you can use directly or edit to your own liking.
  <div draggable="true" id="inxs7-2">The image above is from an external source. If you wish to deploy this user task on an offline engine,</div>
  <div draggable="true" id="inxs7-2-2">please make sure to either delete or replace it with a local image.</div>
  <div draggable="true" id="inxs7-2-3">All the changes you make in this form are being saved automatically</div>
  <div draggable="true" id="inxs7-2-4">You can choose from a variety of blocks or write your own custom code, style your elements, etc.</div>
</div>
<button type="submit" class="button">Submit</button>
</form>`;

export const defaultCss = `button {
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

export const defaultTask = `<html><head><style>${defaultCss}</style></head> <body>${defaultHtml}</body> </html>`;

export const connection = {
  _type: 'hardConstraint',
  _attributes: {},
  name: 'machine.online',
  condition: '==',
  values: [{ value: 'true', _valueAttributes: {} }],
  _valuesAttributes: {},
};

export const listItemsBlock = `<table class="list-item" style="box-sizing: border-box; height: auto; width: 100%; margin-top: 0px; margin-right: auto; margin-bottom: 10px; margin-left: auto; padding-top: 5px; padding-right: 5px; padding-bottom: 5px; padding-left: 5px;" width="100%">
<tbody style="box-sizing: border-box;">
  <tr style="box-sizing: border-box;">
    <td class="list-item-cell" style="box-sizing: border-box; background-color: rgb(255, 255, 255); border-top-left-radius: 3px; border-top-right-radius: 3px; border-bottom-right-radius: 3px; border-bottom-left-radius: 3px; overflow-x: hidden; overflow-y: hidden; padding-top: 0px; padding-right: 0px; padding-bottom: 0px; padding-left: 0px;" bgcolor="rgb(255, 255, 255)">
      <table class="list-item-content" style="box-sizing: border-box; border-collapse: collapse; margin-top: 0px; margin-right: auto; margin-bottom: 0px; margin-left: auto; padding-top: 5px; padding-right: 5px; padding-bottom: 5px; padding-left: 5px; height: 150px; width: 100%;" width="100%" height="150">
        <tbody style="box-sizing: border-box;">
          <tr class="list-item-row" style="box-sizing: border-box;">
            <td class="list-cell-left" style="box-sizing: border-box; width: 30%; padding-top: 0px; padding-right: 0px; padding-bottom: 0px; padding-left: 0px;" width="30%">
              <img src="http://placehold.it/150x150/78c5d6/fff/" alt="Image" class="list-item-image" style="box-sizing: border-box; color: rgb(217, 131, 166); font-size: 45px; width: 100%;">
            </td>
            <td class="list-cell-right" style="box-sizing: border-box; width: 70%; color: rgb(111, 119, 125); font-size: 13px; line-height: 20px; padding-top: 10px; padding-right: 20px; padding-bottom: 0px; padding-left: 20px; font-family: Verdana;" width="70%">
              <h1 class="card-title" style="box-sizing: border-box; font-size: 25px; font-weight: 300; color: rgb(68, 68, 68);">Title here
              </h1>
              <p class="card-text" style="box-sizing: border-box;">Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt
              </p>
            </td>
          </tr>
        </tbody>
      </table>
    </td>
  </tr>
</tbody>
</table>`;
