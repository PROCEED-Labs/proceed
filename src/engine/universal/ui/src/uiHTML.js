module.exports = {
  header: `
<div id="wrapper">
  <div id="header">
    <div class="logo">
    <svg preserveAspectRatio="none" viewBox="0 0 461 125" xmlns="http://www.w3.org/2000/svg"><g fill-rule="evenodd"><path d="m48.62 87.46h-37.14v37.43h-11.48v-51.17h46.63c3.98 0 5.97-1.21 5.97-3.64v-15.7c0-2.81-1.99-4.21-5.97-4.21h-46.63v-13.74h48.04c10.7 0 16.05 4.96 16.05 14.86v21.59c0 9.63-5.16 14.49-15.47 14.58zm38.83 0v-33.36c0-2.81 1.99-4.21 5.98-4.21h43.11v-13.74h-44.52c-10.7 0-16.05 4.96-16.05 14.86v36.45zm78.4-13.74h29.29c3.98 0 5.97-1.35 5.97-4.06v-15.56c0-2.81-1.99-4.21-5.97-4.21h-29.29c-3.91 0-5.86 1.4-5.86 4.21v15.56c0 2.71 1.95 4.06 5.86 4.06zm30.69 13.74h-31.98c-10.7 0-16.05-4.9-16.05-14.72v-21.73c0-9.9 5.35-14.86 16.05-14.86h31.98c10.7 0 16.05 4.96 16.05 14.86v21.73c0 9.82-5.35 14.72-16.05 14.72zm43.99 0h44.52v-13.74h-43.11c-3.99 0-5.98-1.35-5.98-4.06v-15.56c0-2.81 1.99-4.21 5.98-4.21h43.11v-13.74h-44.52c-10.7 0-16.05 4.96-16.05 14.86v21.73c0 9.82 5.35 14.72 16.05 14.72zm80.32-.05h48.15l19.04-25.49-19.04-25.52h-48.15l19.04 25.52zm0 0"/><path d="m296.22 75.3h25.29l9.97-13.39-9.97-13.39h-25.29l10 13.39zm164.51 13.16v-13.74h-46.63c-3.98 0-5.97-1.35-5.97-4.06v-15.57c0-2.8 1.99-4.2 5.97-4.2h46.63v-50.89h-11.6v37.15h-36.43c-10.7 0-16.06 4.95-16.06 14.86v21.73c0 9.81 5.36 14.72 16.06 14.72zm0 0"/></g></svg></div>
    <div class="mobileMenu"><svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="bars" class="svg-inline--fa fa-bars fa-w-14" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path fill="currentColor" d="M16 132h416c8.837 0 16-7.163 16-16V76c0-8.837-7.163-16-16-16H16C7.163 60 0 67.163 0 76v40c0 8.837 7.163 16 16 16zm0 160h416c8.837 0 16-7.163 16-16v-40c0-8.837-7.163-16-16-16H16c-8.837 0-16 7.163-16 16v40c0 8.837 7.163 16 16 16zm0 160h416c8.837 0 16-7.163 16-16v-40c0-8.837-7.163-16-16-16H16c-8.837 0-16 7.163-16 16v40c0 8.837 7.163 16 16 16z"></path></svg></div>`,
  content: `
  </div>
  <div id="content">
    <iframe></iframe>
  </div>
</div>`,
  script: () => {
    const doc = window.document;

    function toggleMobileMenu() {
      doc.querySelector('#nav').classList.toggle('expanded');
      doc.querySelector('#header .mobileMenu').classList.toggle('active');
    }

    function navigate(event) {
      let itemElement = event.target;
      while (itemElement.tagName !== 'LI') {
        itemElement = itemElement.parentElement;
      }

      Array.from(doc.querySelectorAll('#nav li')).forEach((li) => li.classList.remove('active'));
      itemElement.classList.add('active');
      const iframe = doc.createElement('iframe');
      const content = doc.querySelector('#content');
      content.innerHTML = '';
      content.appendChild(iframe);
      iframe.contentWindow.PROCEED_DATA = window.PROCEED_DATA;

      /* DEV
      const xhr = new XMLHttpRequest();
      xhr.addEventListener('loadend', (req) => {
        iframe.contentWindow.document.open();
        iframe.contentWindow.document.write(req.target.response);
        iframe.contentWindow.document.close();
      });
      xhr.open('GET', `http://${window.location.hostname}:9000/`, true);
      xhr.send();
      return;
      /* DEV END */

      iframe.contentWindow.document.open();
      iframe.contentWindow.document.write(window.PROCEED_UI_CONTENTS[itemElement.dataset.key]);
      iframe.contentWindow.document.close();
    }

    // Navigation menu
    doc.querySelectorAll('#nav .item').forEach((item) => {
      item.addEventListener('click', (e) => {
        // Hide burger menu on mobile
        toggleMobileMenu();
        navigate(e);
      });
    });

    // Toggle mobile burger menu
    doc.querySelector('#header .mobileMenu').addEventListener('click', toggleMobileMenu);

    // Show first display item
    navigate({ target: doc.querySelector('#nav li:first-child') });
  },
  css: `
  body, html {
    margin: 0;
    padding: 0;
    font-family: sans-serif;
    color: #464646;
    background: #fafafa;
    font-size: 16px;
  }
  #header {
    position: fixed;
    background-color: white;
    box-shadow: 0px -3px 6px #00000070;
    top: 0;
    left: 0;
    right: 0;
    height: 100px;
    user-select: none;
  }
  #header .logo {
    margin: 0 0 0 45px;
    height: 100%;
    width: 218px;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  #header .logo svg {
    width: 218px;
    height: 49px;
    fill: rgb(89, 89, 89);
  }
  #header .logo svg:hover {
    fill: #0094a0;
  }
  #header .mobileMenu {
    display: none;
  }
  #header .mobileMenu svg {
    height: 1em;
    margin: 6.5px;
  }
  #nav {
    list-style: none;
    margin: 0;
    padding: 0;
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    font-size: 0;
  }
  #nav li {
    display: inline-block;
    height: 100%;
    padding: 0 20px;
    margin: 0;
    font-size: 1.25rem;
    line-height: 100px;
    cursor: pointer;
    border-right: 1px solid #efefef;
    position: relative;
    letter-spacing: 0.5px;
  }
  #nav li:hover, #nav li.active {
    color: #8e8e8e;
    background-color: #f7f7f7;
  }
  #nav li.active {
    color: #0094a0;
  }
  #nav li .badge {
    position: absolute;
    top: 50%;
    right: 6px;
    line-height: initial;
    margin-top: -24px;
    font-size: 10px;
    color: #007cec;
    background-color: #f1f1f1;
    padding: 1px 6px;
    border-radius: 40px;
  }
  #nav li:hover .badge {
    background-color: #007cec;
    color: #f1f1f1;
  }
  #wrapper {
    position: absolute;
    top: 100px;
    bottom: 0;
    left: 0;
    right: 0;
  }
  #content {
    background-color: white;
    font-size: 0; /* no blank line after iframe */
  }
  #content, #content iframe {
    width: 100%;
    height: 100%;
  }
  #content iframe {
    border: none;
  }
  @media (max-width: 1024px) {
    html {
      font-size: 14px;
    }
    #wrapper {
      top: 80px;
    }
    #header {
      height: 80px;
    }
    #nav li {
      line-height: 80px;
      padding: 0px 16px;
    }
    #header .logo svg {
      width: 173.51px;
      height: 39px;
    }
    #header .logo {
      width: 173.51px;
      margin-left: 35px;
    }
  }
  @media (max-width: 768px) {
    html {
      font-size: 10px;
    }
    #wrapper {
      top: 50px;
    }
    #header {
      height: 50px;
    }
    #nav li {
      line-height: 50px;
      padding: 0px 8px;
    }
    #header .logo svg {
      width: 106.78px;
      height: 24px;
    }
    #header .logo {
      width: 106.78px;
      margin-left: 25px;
    }
  }
  @media (max-width: 425px) {
    #nav {
      display: none;
    }
    #header .mobileMenu {
      display: block;
      height: 35px;
      width: 35px;
      position: absolute;
      top: 7.5px;
      right: 15px;
      font-size: 22px;
      text-align: center;
      line-height: 37px;
      border-radius: 5px;
      box-shadow: 0px 0px 2px 0px #a9a9a9;
    }
    #header .mobileMenu.active {
      background-color: #dcdcdc;
      box-shadow: inset 0px 0px 4px #949494;
    }
    #nav.expanded {
      position: relative;
      display: block;
    }
    #nav.expanded li {
      display: block;
      background-color: white;
      border-top: 1px solid #f1f1f1;
      z-index: 1;
    }
    #nav.expanded li:last-child {
      box-shadow: 0px -3px 6px #00000070;
      z-index: 0;
    }
  }
  `,
};
