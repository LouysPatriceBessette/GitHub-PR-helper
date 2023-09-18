// ==UserScript==
// @name         GitHub Pull Requests helper
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Deploys all threads (loads all hidden - adds numbers and a context menu)
// @author       Louys Patrice Bessette
// @match        https://github.com/*/*/pull/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=github.com
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const root = document.documentElement
    const addedStyle = `
.progressModal {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 1em;
  z-index: 999999;
  background-color: lightgrey;
  border: 1px solid black;
  border-radius: 6px;
  font-weight: bold;
}
.conversationNumber {
  background-color: red;
  padding: 3px;
  border-radius: 50%;
  color: white;
  font-weight: bold;
  width: 2em;
  text-align: center;
  cursor: help;
}
.convContext {
  position: fixed;
  top: 20px;
  background-color: grey;
  padding: 6px;
  border-radius: 6px;
  color: white;
  display: flex;
  flex-direction: column;
}
.convLinkBtn, .convSrcBtn {
  cursor: grab;
}
.convLinkBtn:active, .convSrcBtn:active {
  cursor: grabbing;
}
`
    const addedStyleTag = document.createElement("style")
    addedStyleTag.append(addedStyle)
    root.querySelector("head").append(addedStyleTag)

    let openConvDelay = 5000
    const openConvSetTimer = () => setTimeout(openAllConversation, openConvDelay)

    const openAllConversation = () => {
        console.log("openAllConversation")
        let hiddenConv = Array.from(document.querySelectorAll(".js-review-hidden-comment-ids"))
        let pagination = Array.from(document.querySelectorAll(".pagination-loader-container"))
        let clickableLinks = hiddenConv.concat(pagination)
        if(clickableLinks.length) {
            clickableLinks[0].querySelector(".ajax-pagination-btn").click()
            openConvSetTimer()
            return
        }
        endInit()
    }

    let conversationCount = 0
    let resolvedCount = 0
    const setConversationNumbers = () => {
        console.log("Init")
        const conversations = Array.from(document.querySelectorAll("[id^=review-thread-or-comment-id-]"))
        conversationCount = conversations.length

        conversations.forEach((conversation, index) => {
            const numberElement = document.createElement("div")
            numberElement.title = "Right-click me!"
            numberElement.classList.add("conversationNumber")
            numberElement.innerText = index + 1
            numberElement.dataset.conversationNumber = index + 1
            conversation.querySelector("summary div").append(numberElement)

            if(conversation.querySelector('.Details-content--closed')){
                resolvedCount++
            }
        })
    }

    // If url has a conversation id
    // scroll up by 60px because of the top sticky header
    const scrollToConversation = () => {
        if (location.hash.substr(0, 29) == "#review-thread-or-comment-id-"){
            const hashPos = root.scrollTop
            console.log("scroll to:", hashPos)
            root.scrollTo({top: hashPos - 60})
        }
    }

    const showScriptInProgress = () => {
        const modal = document.createElement("div")
        modal.classList.add("progressModal")
        modal.innerText = "GitHub Helper processing..."
        root.querySelector("body").append(modal)

    }

    const setScriptResult = () => {
        const modal = document.querySelector(".progressModal")
        const currWidth = modal.getBoundingClientRect().width
        const percentageResolved = Math.round(resolvedCount / conversationCount * 100)
        modal.innerHTML = `${conversationCount} comment` + (conversationCount > 1 ? 's' : '') + (conversationCount > 0 ? `<br>Resolved at ${percentageResolved}%` : '')
        modal.style.width = currWidth + "px"
    }

    // Click event handler for the context menu on numbers
    const addClickListeners = () => {
        const convNumbers = Array.from(document.querySelectorAll(".conversationNumber"))
        convNumbers.forEach((convNumber) => {
            convNumber.addEventListener("contextmenu", (event) => {
                event.preventDefault()
                const turboFrame = event.target.closest("turbo-frame")
                const convId = turboFrame.id
                let convSrcFile = turboFrame.querySelector("details summary div span").innerText
                if(convSrcFile.indexOf("...") > -1) {
                    const convSrcFileClean = convSrcFile.split("/")
                    convSrcFileClean.shift()
                    convSrcFile = convSrcFileClean.join("/")
                }
                const convPos = {top: event.clientY -15 + "px", left: event.clientX + 35 + "px"}
                if(convSrcFile.indexOf("\n") > -1) {
                    convSrcFile = convSrcFile.slice(0, convSrcFile.indexOf("\n"))
                }
                setContext(convId, convSrcFile, convPos)
            })
        })
    }

    // Setting the context menu
    const setContext = (url, convSrcFile, pos) => {
        const context = document.createElement("div")
        context.classList.add("convContext")

        const linkBtn = document.createElement("button")
        linkBtn.classList.add("convLinkBtn")
        linkBtn.innerText = "Copy conversation url" //url
        linkBtn.dataset.clipboardData = `${location.href.split("#")[0]}#${url}`
        context.append(linkBtn)

        const srcBtn = document.createElement("button")
        srcBtn.classList.add("convSrcBtn")
        srcBtn.innerText = "Copy source file path" //convSrcFile
        srcBtn.dataset.clipboardData = convSrcFile
        context.append(srcBtn)

        context.style.top = pos.top
        context.style.left = pos.left
        root.append(context)

        // Auto hide
        setTimeout(() => {
            context.remove()
        }, 3500)
    }

    const endInit = () => {
        setConversationNumbers()
        console.log('conversationCount', conversationCount, 'resolvedCount', resolvedCount)
        scrollToConversation()
        setScriptResult()
        addClickListeners()
    }

    document.documentElement.addEventListener("click", function(e){
        const target = e.target
        const targetText = target.innerText
        const targetData = target.dataset.clipboardData
        const targetWidth= target.getBoundingClientRect().width

        // Set context menu width
        target.style.width = targetWidth + "px"
        if(target.classList.contains("convSrcBtn") || target.classList.contains("convLinkBtn")){
            clipboard(target, targetText, targetData)
        }
    })

    // Clipbard copy function
    const clipboard = (target, targetText, targetData) => {
        navigator.clipboard.writeText(targetData)
        target.innerText = "Copied!"
        setTimeout(() => {target.innerText = targetText}, 900)
    }

    // Get to specific number by keyboard input
    let keydownTimout
    let numbertoreach = ""
    document.addEventListener("keydown", function(e){
        if(e.target.tagName === "TEXTAREA"){ return }
        if(e.key.match(/[a-z]/gi)){ return }

        clearTimeout(keydownTimout)
        if(localStorage.getItem("numbertoreach")){
            numbertoreach = localStorage.getItem("numbertoreach") + e.key
        } else {
            numbertoreach = e.key
        }
        localStorage.setItem("numbertoreach", numbertoreach)

        keydownTimout = setTimeout(function(){
            let targetConversation = Array.from(document.querySelectorAll(".conversationNumber")).find((conv) => conv.dataset.conversationNumber === numbertoreach)
            console.log("Conversation number to scroll to:", numbertoreach)

            if(targetConversation){
                root.scrollTo({top: 0})
                let convPosition = targetConversation.getBoundingClientRect().top
                //console.log("convPosition", Math.round(convPosition))
                root.scrollTo({top: Math.abs(Math.round(convPosition)) - 70})
            }
            localStorage.removeItem("numbertoreach")
        },500)
    })

    // Init (on page load)
    openConvSetTimer()
    showScriptInProgress()
})();
