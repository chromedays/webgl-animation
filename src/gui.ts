import { Scene, SceneState } from "./scene";

export function html(tokens: TemplateStringsArray, ...values: (number | string | [string, () => void] | HTMLElement | HTMLElement[])[]): HTMLElement {
    let callbacks: [string, () => void][] = [];
    let children: (HTMLElement | HTMLElement[])[] = [];

    let htmlString = tokens[0];
    for (let i = 1; i < tokens.length; ++i) {
        let v = values[i - 1];
        if (typeof v === 'number') {
            htmlString += v.toString();
        } else if (typeof v === 'string') {
            htmlString += v;
        } else if (v instanceof HTMLElement) {
            htmlString += `child="${children.length}"`;
            children.push(v);
        } else if (Array.isArray(v) && typeof v[0] === 'string' && typeof v[1] === 'function') {
            htmlString += `${v[0]}="${callbacks.length}"`;
            callbacks.push(v as [string, () => void]);
        } else if (Array.isArray(v) && (v[0] instanceof HTMLElement)) {
            htmlString += `child="${children.length}"`;
            children.push(v as HTMLElement[]);
        }
        htmlString += tokens[i];
    }

    let htmlNode = document.createElement('div');
    htmlNode.innerHTML = htmlString;

    callbacks.forEach((cb, i) => {
        let node = htmlNode.querySelector(`[${cb[0]}="${i}"]`)!;
        node.addEventListener(cb[0], cb[1]);
        node.removeAttribute(cb[0]);
    })

    // console.log(htmlNode.innerHTML);
    children.forEach((child, i) => {
        let nodes =
            [htmlNode, ...htmlNode.querySelectorAll('*')];
        let parentNode: Element | null = null;
        for (let j = 0; j < nodes.length; ++j) {
            let node = nodes[j];
            if (node.innerHTML.search(`child="${i}"`) >= 0) {
                node.innerHTML = node.innerHTML.replace(`child="${i}"`, '');
                parentNode = node;
                break;
            }
        }
        console.assert(parentNode != null);
        if (Array.isArray(child)) {
            child.forEach(c => {
                parentNode!.appendChild(c);
            })
        } else {
            parentNode!.appendChild(child);
        }
    });

    return htmlNode;
}

export function input(label: string, id: string, type: string, extraAttributeString: string, checked: boolean, onClick: (b: boolean) => void) {
    return html`
    <input id="${id}" type="${type}" ${extraAttributeString} ${checked ? 'checked': ''} ${['click', () => {
        // checked = !checked; onClick(checked);
        console.log('test');
    }]}>
    <label for="${id}"">${label}</label>
    `;
}

export function animationSelector(scene: Scene, sceneState: SceneState): HTMLElement {
    let onClick = (animIndex: number) => {
        sceneState.animIndex = animIndex;
        sceneState.tick = 0;
    };

    return html`
    <div id="animation_selector" class="sidebar_block">
        <div>Select Animation: </div>
        ${[{ name: 'Idle', index: -1 }, ...scene.animations.map((anim, animIndex) => ({ name: anim.name, index: animIndex }))]
            .map(animInfo => html`
        ${input(animInfo.name, animInfo.name, "radio", 'name="anim"', animInfo.index === sceneState.animIndex, _ => onClick(animInfo.index))}`)}
    </div>`;
}

export function visibilityController(onToggleModel: (b: boolean) => void, onToggleBones: (b: boolean) => void): HTMLElement {
    return html`
    <div>
        <div>
            Visibility Options:
        </div>
        ${input('Draw Model', 'draw_model', 'checkbox', '', true, b => onToggleModel(b))}
        ${input('Draw Bones', 'draw_bones', 'checkbox', '', false, b => onToggleBones(b))}
    </div>
    `;
}

export function animationPlayer(): HTMLElement {return html``;}

export function curveController(): HTMLElement {return html``;}

export function frameRate(): HTMLElement {return html``;}

// class AnimationSelector extends Widget{
//     constructor(
//         scene: Scene,
//         sceneState: SceneState
//     ) {
//         super(document.createElement('div'));
//         this.root.id = 'animation_selector';
//         this.root.classList.add('sidebar_block');

//         this.root.innerHTML = `
//         <div>Select Animation: </div>
//         ${scene.animations.map(anim => {
//             return `
//             <div>
//                 <input id="${anim.name}" type="radio" name="anim">
//                 <>
//             </div>`
//         })}
//         `;

//         function addButton(animName: string, animInde: number) {
//             let button = document.createElement('input');
//             button.id = "IDle"
//             button.setAttribute('type', 'radio');
//             button.setAttribute('name', 'anim');
//             if (sceneState.animIndex === -1) {
//                 button.checked = true;
//             }

//             let label = document.createElement('label');
//             label.setAttribute('for', button.id);
//             label.innerHTML = "Idle"
//             button.addEventListener('click', () => {
//                 sceneState.animIndex = -1;
//                 sceneState.tick = 0;
//             });

//             div.appendChild(button);
//             div.appendChild(label);
//             root.appendChild(div);
//         }
//     }
// }

// function setupAnimSelector(root: Element, sceneState: SceneState, scene: Scene) {
//     let div = document.createElement('div');

//     function addButton(animName: string, animInde: number) {
//         let button = document.createElement('input');
//         button.id = "IDle"
//         button.setAttribute('type', 'radio');
//         button.setAttribute('name', 'anim');
//         if (sceneState.animIndex === -1) {
//             button.checked = true;
//         }

//         let label = document.createElement('label');
//         label.setAttribute('for', button.id);
//         label.innerHTML = "Idle"
//         button.addEventListener('click', () => {
//             sceneState.animIndex = -1;
//             sceneState.tick = 0;
//         });

//         div.appendChild(button);
//         div.appendChild(label);
//         root.appendChild(div);
//     }
// }