let pages;
let book;
let control;
let building;

//urlParams
const getUrlParams = () => {
  const params = Object.create(null);
  if (window.location.search == "") return params;
  window.location.search.substr(1).split("&").forEach(param => {
    let p = param.split("=", 2);
    params[p[0]] = p.length == 1? "": decodeURIComponent(p[1].replace(/\+/g, " "));
  });
  return params;
};

const urlParams = getUrlParams();

const lang = urlParams.lang || 'ru';

const onPageVisibilityChange = ({ detail: { index, visible } }) => {
  if (!visible) {
    return;
  }

  const { onceOpened, video, images } = pages[index];

  if (onceOpened) {
    return;
  }

  pages[index].onceOpened = true;

  if (video) {
    video.removeAttribute('preload');
    video.load();
  }

  images.forEach(image => image.setAttribute('src', image.dataset.src.replace('_text.', `_text-${lang}.`)));
};

const tryToPlay = () => {
  if (!book) {
    return;
  }

  const currentPage = book.currentPage;
  const visiblePages = book.visiblePages;

  visiblePages.forEach(pageIndex => {
    const page = pages[pageIndex];
    if (!page.video || page.isDependant || !page.video.readyState === 4 || page.played) {
      return;
    }

    const isCurrent = pageIndex === currentPage || pageIndex === (currentPage + 1);

    if (!page.dependantVideo) {
      if (isCurrent || (page.video.loop && book.isPageTurning)) {
        page.video.play();
        page.played = true;
      }

      return;
    }

    if (!page.dependantVideo.readyState === 4) {
      return;
    }

    if (isCurrent || (page.video.loop && book.isPageTurning)) {
      page.video.play();
      page.dependantVideo.play();
      page.played = true;
    }
  });
};

const syncDependencies = () => {
  book.visiblePages.forEach(pageIndex => {
    const page = pages[pageIndex];
    if (!page.video || !page.dependantVideo || !page.played) {
      return;
    }

    if (Math.abs(page.video.currentTime - page.dependantVideo.currentTime) < 0.05) {
      return;
    }

    page.dependantVideo.currentTime = page.video.currentTime;
    page.video.currentTime = page.dependantVideo.currentTime;
  });
};

const onVideoReady = event => {
  tryToPlay();
};

const onCurrentPageChange = ({ detail: { currentPage, previousPage } }) => {
  if (currentPage === previousPage) {
    return;
  }

  tryToPlay();
  [previousPage, previousPage + 1].forEach(pageIndex => {
    const page = pages[pageIndex];

    if (!page || !page.video || page.isDependant || !page.video.readyState === 4) {
      return;
    }

    page.video.pause();
    page.video.currentTime = 0;
    page.played = false;

    if (!page.dependantVideo || !page.dependantVideo.readyState === 4) {
      return;
    }

    page.dependantVideo.pause();
    page.dependantVideo.currentTime = 0;
  });
};

window.addEventListener('DOMContentLoaded', () => {
  if (urlParams.hideLinks) {
    document.getElementById('body').classList.add('body_hide-links');
  }
});

window.onload = () => {
  const bookDomElement = document.getElementById('book');

  pages = Array.from(bookDomElement.getElementsByClassName('book__page'))
    .map((page, pageIndex) => {
      const video = page.getElementsByTagName('video')[0];

      if (video) {
        Array.from(video.getElementsByTagName('source')).forEach(source => {
          if (source.dataset.src) {
            source.src = source.dataset.src.replace('_text.', `_text-${lang}.`);
          }
        });
      }

      return {
        video,
        images: Array.from(page.getElementsByTagName('img')),
        onceOpened: false,
        pageIndex,
        played: false,
      };
    })
  ;

  const langLink = document.getElementById('lang-link');

  if (langLink) {
    langLink.classList.add(`lang-link_lang_${lang}`);

    langLink.href = `?lang=${lang == 'ru' ? 'tat' : 'ru'}`;
  }

  const hint = document.querySelector('.content__hint-video source');
  if (hint) {
    hint.src = hint.dataset.src.replace('_text.', `_text-${lang}.`);

    document.querySelector('.content__hint-video').load();
  }

  let controlPageIndex;
  let buildingPageIndex;

  pages.forEach(({ video, pageIndex }) => {
    if (!video) {
      return;
    }

    video.$pageIndex = pageIndex;

    const progressHandler = (e) => {
      if (e.total && e.loaded) {
        pages[pageIndex].page.style = `--loading-progress: ${e.loaded / e.total}`;
      }
    }

    video.addEventListener('progress', progressHandler, false);

    if (video.dataset.dependant) {
      pages[pageIndex].isDependant = true;
    }

    if (video.dataset.leadof) {
      pages[pageIndex].dependantVideo = document.getElementById(video.dataset.leadof);
    }

    if (video.id === 'control-video') {
      controlPageIndex = pageIndex;
    }

    if (video.id === 'building-video') {
      buildingPageIndex = pageIndex;
    }

    video.addEventListener('canplaythrough', onVideoReady);
  });

  bookDomElement.addEventListener('pageVisibilityChange', onPageVisibilityChange);
  bookDomElement.addEventListener('currentPageChange', onCurrentPageChange);
  book = new Book(bookDomElement);

  control = new Control({
    page: document.getElementById('control'),
    video: document.getElementById('control-video'),
    book,
    pageIndex: controlPageIndex,
  });

  // building = new Building({
  //   domElem: document.getElementById('building'),
  //   video: document.getElementById('building-video'),
  //   leftPage: document.getElementById('building-leftPage'),
  //   rightPage: document.getElementById('building-rightPage'),
  //   book,
  //   pageIndex: buildingPageIndex,
  // });

  setInterval(syncDependencies, 500);

  let fullscreenEnabled = false;
  const body = document.getElementById('body');

  body.classList.add(`body_lang_${lang}`);

  if (body.requestFullscreen) {
    body.classList.add('body_canBeFullscreen');
  }

  document.getElementById('fullscreenButton').addEventListener('click', () => {
    if(fullscreenEnabled) {
      document.exitFullscreen();
      fullscreenEnabled = false;
      body.classList.remove('body_fullscreen');
    } else {
      body.requestFullscreen();
      fullscreenEnabled = true;
      body.classList.add('body_fullscreen');
    }
  });
};
