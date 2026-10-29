[English](../README.md) · [العربية](README.ar.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [日本語](README.ja.md) · **한국어** · [Русский](README.ru.md) · [Українська](README.uk.md) · [Tiếng Việt](README.vi.md) · [简体中文](README.zh.md) · [繁體中文](README.zh-hant.md)

# ALUX 프로그래밍 가이드

![ALUX 프로그래밍 가이드](../public/social/alux-programming-ko.jpg)

프로그램이 무엇을 의미하는지 먼저 정의하고, 실행 방법은 그다음에 선택하는 설계를 다룹니다. Conal Elliott의 지시적 설계를 바탕으로 합성, 법칙, 해석기를 설명하고 Rust의 능력 trait와 예제를 통해 구현으로 이어갑니다.

## 책의 구성

- 의미론적 관점: 지시, 합성성, 법칙, 해석, 의존 타입.
- Rust에서 의미로 설계하기: 능력, 파생 연산, 해석기, 증거, 컴파일러 파이프라인.
- 개념: 연산 의미론, 자유 모나드, 연속, 비함수화 등의 메커니즘.
- 통찰: 이러한 메커니즘과 프로그램의 의미 및 실행 사이의 관계.

## 읽기

웹 리더는 11개 언어를 지원하며, 페이지를 넘기는 마법책과 스크롤로 읽는 간결한 기술 문서의 두 가지 화면을 제공합니다. 글자 크기, 밝은 테마와 어두운 테마, 검색, 책갈피를 지원합니다. 직접 선택한 언어와 각 장의 읽기 위치는 기기에 저장됩니다.

마법 세계에서는 현재 장을 필요할 때 페이지로 나눕니다. 페이지 번호는 해당 장 안의 진행 상황을 나타냅니다. 글자 크기나 창 크기를 바꾸면 레이아웃을 다시 계산하면서 상대적인 읽기 위치를 유지합니다.

[한국어판 열기](https://programming.alux.network/ko/)

## 개발 및 유지보수

빌드와 실행 방법은 [영문 유지보수 안내](../README.md#build-and-run-locally)를 참고하세요. 프로젝트를 이어서 작업할 때는 [Agent 안내](../AGENTS.md)도 확인하세요.

## 기여자

[Tomislav Grospić (@tgrospic)](https://github.com/tgrospic)은 책의 원문을 집필하고 초기 웹사이트를 구축했으며, mdBook 기반 구조와 빌드 과정을 재구성했습니다.

[Shixi Lin (@shixi-11)](https://github.com/shixi-11)은 웹사이트 UI를 디자인하고 다국어 읽기 기능 개발, 여러 브라우저에서의 테스트, 호환성 개선에 기여했습니다.
