var compareItemList = []
var colourList = []

const random_hex_color_code = () => {
    // Generate a random number and convert it to hexadecimal string representation.
    let n = (Math.random() * 0xfffff * 1000000).toString(16);
    // Return the hexadecimal color code with '#' appended.

    return '#' + n.slice(0, 6);
};

function add_remove_CompareItems(idno, fileName, action) {
    if (action === 'add') {
        let obj = data.find(x => x.idno === idno && x.fileName === fileName)
        let index = data.findIndex(x => x.idno === idno && x.fileName === fileName)

        var borderColour = ''
        if (colourList.length === 0) {
            borderColour = random_hex_color_code()
            colourList.push(borderColour)
        }
        else {
            borderColour = random_hex_color_code();
            while (colourList.includes(borderColour)) {
                borderColour = random_hex_color_code()
            }
            colourList.push(borderColour)
        }

        data[index]['isAdded'] = true;
        data[index]['borderColour'] = borderColour;
        obj['borderColour'] = borderColour;

        compareItemList.push(obj);
    } else {
        let obj = data.find(x => x.idno === idno && x.fileName === fileName)
        let index = data.findIndex(x => x.idno === idno && x.fileName === fileName)
        delete data[index]['isAdded']
        delete data[index]['borderColour'];
        compareItemList = compareItemList.filter(x => x.idno !== obj.idno && x.fileName !== obj.fileName);
    }

    showData(data);
    showItemList();
}

async function showItemList() {
    let html = ''
    let cardFasc = ''
    let cardTrans = '';
    let marginLeft = 0;

    for (let i of compareItemList) {
        html += ` <div class="card text-bg-light mb-1 mt-1" style="border-top: 4px solid ${i.borderColour};">
                    <div class="card-header" style="cursor:pointer;" onclick="showFascCodePanels(this, '${i.borderColour.replace('#', '')}')">
                        <i class="fas fa-times float-end ms-2" style="cursor:pointer;" title="Close" onclick="add_remove_CompareItems('${i.idno}', '${i.fileName}', 'remove')"></i>
                        ${i.title.substring(0, 100)}
                    </div>
                    <div class="card-body">
                        <div class="form-check form-switch float-start">
                            <input class="form-check-input" type="checkbox" role="switch"
                                id="chkFacsimile-${i.borderColour.replace('#', '')}" checked onchange="toggleFascimilePanel(this, '${i.borderColour.replace('#', '')}', '')">
                            <label class="form-check-label" for="chkFacsimile">Facsimile <i class="fas fa-image"></i></label>
                        </div>
                        <div class="form-check form-switch float-end">
                            <input class="form-check-input" type="checkbox" role="switch"
                                id="chkTranscript-${i.borderColour.replace('#', '')}" onchange="toggleTranscriptPanel(this, '${i.borderColour.replace('#', '')}', '')">
                            <label class="form-check-label" for="chkTranscript">Transcription <i class="fas fa-code"></i></label>
                        </div>
                    </div>
                </div>`;

        cardFasc += `<div class="card card-dragable text-bg-light h-100" id="fasc-${i.borderColour.replace('#', '')}" style="min-width: 35%;width: 35%;margin-left:${marginLeft}rem;z-index:0;border-top: 4px solid ${i.borderColour}">
                        <div class="card-header draggable">
                        <i class="fas fa-times float-end ms-2" style="cursor:pointer;" title="Close" onclick="toggleFascimilePanel(this, '${i.borderColour.replace('#', '')}', 'close')"></i>
                        <i class="far fa-window-maximize float-end align-top" style="cursor:pointer;" title="Maximize" onclick="maximizeToggle(this, '${i.borderColour.replace('#', '')}')"></i>
                        ${i.title.substring(0, 60)}
                        </div>
                        <div class="card-body">
                            <iiif-storyboard 
                                url="https://raw.githubusercontent.com/JoshuaAPhillips/digital-anon/main/manifests/${i.idno}-manifest.json"
                                styling="overlaynext: true; toggleoverlay:true;" class="h-100">
                            </iiif-storyboard>
                        </div>
                    </div>`;

        cardTrans += `<div class="card card-dragable text-bg-light h-100" id="trans-${i.borderColour.replace('#', '')}" style="min-width: 26%;width: 26%;margin-left:${marginLeft}rem;z-index:0;border-top: 4px solid ${i.borderColour}; display:none">
                    <div class="card-header draggable">
                    <i class="fas fa-times float-end ms-2" style="cursor:pointer;" title="Close" onclick="toggleTranscriptPanel(this, '${i.borderColour.replace('#', '')}', 'close')"></i>
                    <i class="far fa-window-maximize float-end align-top" style="cursor:pointer;" title="Maximize" onclick="maximizeToggle(this, '${i.borderColour.replace('#', '')}')"></i>
                    ${i.title.substring(0, 60)}
                    </div>
                    <div class="card-body myXMLContainer">
                        <textarea class="xmlEditor">${await getXMLFileContent(i.fileURL)}</textarea>
                    </div>
                </div>`;

        marginLeft += 3;

    }

    $('#divComparelist').html(html)
    $('#containment-wrapper').html(cardFasc + cardTrans)
    //$('#containment-wrapper').html($('#containment-wrapper').html() + cardTrans)
    $(".card-header.draggable").parent().draggable(
        {
            handle: '.draggable',
            containment: "#containment-wrapper",
            scroll: false,
            cursor: 'move',
            start: function () {
                //console.log('start')
                $('.card-dragable').css('z-index', "0")
                $(this).css('z-index', "1")
                $(this).css('margin-left', "")
            },
            drag: function () {
                $(this).css('z-index', "1")
            },
            stop: function () {
                $(this).css('z-index', "1")
            }
        }).resizable();

    for (let index = 0; index < document.getElementsByClassName('xmlEditor').length; index++) {
        var xmlEditor = CodeMirror.fromTextArea(document.getElementsByClassName("xmlEditor")[index], {
            mode: "xml",
            lineNumbers: true,
            scrollbarStyle: "overlay",
            matchTags: { bothTags: true },
            extraKeys: { "Ctrl-J": "toMatchingTag" },
            autoCloseTags: true,
            autofocus: true,
            autoRefresh: true,
        });
    }
}

function showFascCodePanels(ele, pnlId) {
    $('.card-dragable').css('z-index', "0")
    $(`#fasc-${pnlId}`).css('z-index', '1')
}

function toggleFascimilePanel(ele, pnlId, isClose) {
    $(`#fasc-${pnlId}`).toggle()
    if($(`#chkFacsimile-${pnlId}`).is(":checked") && isClose === 'close')
        $(`#chkFacsimile-${pnlId}`).prop('checked', false)
}

function toggleTranscriptPanel(ele, pnlId, isClose) {
    $(`#trans-${pnlId}`).toggle()

    if($(`#chkTranscript-${pnlId}`).is(":checked") && isClose === 'close')
        $(`#chkTranscript-${pnlId}`).prop('checked', false)
}

function maximizeToggle(ele, pnlId){
    if($(ele).hasClass('fa-window-restore')){
        $(ele).parent().parent().css('width', '35%')
        $(ele).removeClass('fa-window-restore')
        $(ele).addClass('fa-window-maximize')
    }
    else{
        $(ele).parent().parent().css('width', '95%')
        $(ele).removeClass('fa-window-maximize')
        $(ele).addClass('fa-window-restore')
    }
}

async function getXMLFileContent(fileUrl) {
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
        console.log(`Failed to fetch ${xmlFile.filename}`);
        return '';
    }
    const fileContent = await fileResponse.text();
    return fileContent.trim();
}

/////////////////////////////////////////////////////////////////
//// Dragable stuff
// $(function () {
//     $(".card-header.draggable").parent().draggable({ handle: '.draggable', containment: "#containment-wrapper", scroll: false, cursor: 'move' }).resizable();

//     $( ".card-header.draggable" ).parent().resizable({
//         containment: "#containment-wrapper"
//       });
// });