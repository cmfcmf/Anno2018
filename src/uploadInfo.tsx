import * as React from "react";
import { ChangeEvent } from "react";
import { UploadLogger } from "./upload";

interface Props {
  onUploaded: (file: File) => Promise<boolean>;
  onReset: () => Promise<void>;
  onSaveOrMissionUploaded: (
    evt: ChangeEvent<HTMLInputElement>
  ) => Promise<void>;
  setLogger: (logger: UploadLogger) => void;
}

interface State {
  isUploading: boolean;
  messages: Array<{ msg: string; type: "info" | "warn" | "error" }>;
}

export default class UploadInfo extends React.Component<Props, State>
  implements UploadLogger {
  constructor(props: Props) {
    super(props);

    this.state = {
      isUploading: false,
      messages: []
    };

    this.props.setLogger(this);
  }

  public render() {
    return (
      <div
        style={{
          marginLeft: "1em",
          marginRight: "1em",
          fontFamily: "Arial",
          maxWidth: "800px",
          lineHeight: 1.4
        }}
      >
        <h1>Anno 2018</h1>
        <p>
          Welcome to Anno 2018, an effort to port twenty-year-old Anno 1602 to
          the browser. This is in early development, however, you can already
          load your savegames and start new games. Much of the actual simulation
          is still missing though. For copyright reasons, we can't include the
          original Anno 1602 files and graphics.{" "}
          <strong>
            You need own your own copy of Anno 1602 for Anno 2018 work.
          </strong>
        </p>
        <p>
          The following versions have been tested by us and confirmed to work:
        </p>
        <ul>
          <li>German "Anno 1602 Köngisedition"</li>
          <li>English "Anno 1602 A.D." from GOG</li>
        </ul>
        <p>
          Anno 2018 is tested in the latest versions of{" "}
          <strong>Chrome (preferred, faster) and Firefox</strong> only. Other
          browsers <em>might</em> work, but aren't supported.
        </p>
        <p>
          To get started, follow these steps. You will need to "upload" your
          Anno files on this website. Don't worry though, the files{" "}
          <em>never</em> leave your PC and are only uploaded into your browser.
          Once uploaded, the files remain in your browser and will be there when
          you re-open this website.
        </p>
        <ol>
          <li>
            Find your Anno 1602 files and zip them. If you are using a version
            of Anno 1602 which came with a physical CD, copy the videosmk and
            music8 folders into your Anno 1602 root folder before creating the
            zip file.
          </li>
          <li>
            Use the upload button below to upload the zip file. The file should
            be around 50MB if it doesn't contain music and videos, and around
            500MB if it does.
          </li>
          <li>
            <p>
              Grab a coffee. The upload takes some time. Progress is being
              logged below. Should anything go wrong, take a look at the error
              message. It might tell you what to do. If it doesn't, make sure
              you're using a recent version of Chrome or Firefox. If it is still
              not working,{" "}
              <a href="https://reddit.com/u/cmfcmf">drop me a note at reddit</a>
              , <a href="https://twitter.com/christianmflach">twitter</a>, or{" "}
              <a href="https://github.com/cmfcmf/Anno2018">
                create an issue at GitHub
              </a>
              . Make sure to include the upload progress output.
            </p>
            Upload:{" "}
            <input
              type={"file"}
              multiple={false}
              accept={".zip"}
              onChange={this.zipUploaded}
              disabled={this.state.isUploading}
            />
          </li>
        </ol>

        <h2>
          Upload Progress <small>(newest at the top)</small>
        </h2>
        {this.state.messages.length === 0 && <p>Nothing yet...</p>}
        <div style={{ fontSize: "10px" }}>
          {this.state.messages.map((message, i) => (
            <div key={i}>
              <span
                style={{
                  color:
                    message.type === "info"
                      ? "blue"
                      : message.type === "warn"
                        ? "orange"
                        : "red"
                }}
              >
                {message.type.toUpperCase()}
              </span>
              : {message.msg}
            </div>
          ))}
        </div>

        <h2>Uploading custom missions and additional savegames</h2>
        <p>
          Use this button to upload additional missions or savegames after you
          uploaded the main game:{" "}
          <input
            type={"file"}
            multiple={true}
            accept={".szm,.szs,.gam"}
            onChange={this.props.onSaveOrMissionUploaded}
          />
        </p>

        <h2>Resetting files</h2>
        <p>
          You can use the "Reset all files" button to delete all uploaded files
          if needed: <button onClick={this.resetFiles}>Reset all files</button>
        </p>
      </div>
    );
  }

  public readonly info = (msg: string) => {
    this.log(msg, "info");
  };

  public readonly warn = (msg: string) => {
    this.log(msg, "warn");
  };

  public readonly error = (msg: string) => {
    this.log(msg, "error");
  };

  private readonly log = (msg: string, type: "info" | "warn" | "error") => {
    this.setState((prevState: State) => {
      return {
        ...prevState,
        messages: [{ msg, type }, ...prevState.messages]
      };
    });
  };

  private zipUploaded = async (evt: ChangeEvent<HTMLInputElement>) => {
    const files = evt.target.files;
    if (files === null || files.length !== 1) {
      alert("Please select the zipped Anno1602 folder to upload.");
      return;
    }
    const file = files[0];
    if (!file.name.endsWith(".zip")) {
      alert("You need to upload a .zip file!");
      return;
    }

    this.setState({ isUploading: true });
    const worked = await this.props.onUploaded(file);
    this.setState({ isUploading: false });

    if (worked) {
      this.info("Upload finished. Please reload the page.");
      alert("Upload finished. Please reload the page.");
    } else {
      this.error("The upload failed.");
      alert("The upload failed.");
    }
  };

  private resetFiles = async () => {
    await this.props.onReset();
    alert("All files deleted. The page will now refresh.");
    window.location.reload(true);
  };
}
