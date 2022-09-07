import {
  Streamlit,
  StreamlitComponentBase,
  withStreamlitConnection,
} from "streamlit-component-lib";
import React, {ReactNode} from "react";
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome'
import {faSpinner, faCheckCircle, faExclamationTriangle, faHourglassHalf} from '@fortawesome/free-solid-svg-icons'

interface State {
  visibleItem?: string;
}

let styles = {
  card: {
    marginTop: 4,
    border: "1.5px solid",
    borderRadius: 4,
    padding: 12,
    cursor: 'pointer',
    borderColor: "rgba(0, 0, 0, 0.12)",
    fontFamily: "\"Roboto\", \"Helvetica\", \"Arial\", sans-serif",
    display: "flex" as "flex",
  },
  highlightCard: {
    borderColor: "#2196f3"
  },
  cardHeaderIcon: {
    marginRight: 12,
    height: 24,
  },
  cardHeaderId: {
    marginRight: 12,
    color: 'rgba(0, 0, 0, 0.54)',
    minWidth: 20,
    display: 'inline-block',
    textTransform: "uppercase" as "uppercase"
  },
  cardHeaderContent: {
    display: "inline-block",
    color: 'rgba(0, 0, 0, 0.54)',
    width: '100%',
    whiteSpace: "nowrap" as "nowrap",
    overflow: "hidden" as "hidden",
    textOverflow: "ellipsis" as "ellipsis",
  },
  cardContent: {
    marginTop: 4,
    borderRadius: 4,
    padding: 12,
    backgroundColor: 'rgb(14, 17, 23)',
    color: '#00f900'
  },
  truncate: {
    width: '100%',
    whiteSpace: "nowrap" as "nowrap",
    overflow: "hidden" as "hidden",
    textOverflow: "ellipsis" as "ellipsis",
  },
}

class ToggleList extends StreamlitComponentBase<State> {
  public state: State = {};

  public clickCard = (id: string) => {
    return () => {
      if (this.state.visibleItem === id) {
        this.setState({visibleItem: undefined});
      } else {
        this.setState({visibleItem: id});
      }
    }
  }

  public getIcon = (name: string) => {
    switch (name) {
      case "spinner":
        return <FontAwesomeIcon icon={faSpinner} spin={true} color={"#2196f3"} style={styles.cardHeaderIcon}/>
      case "circle-check":
        return <FontAwesomeIcon icon={faCheckCircle} color={"#4caf50"} style={styles.cardHeaderIcon}/>
      case "triangle-exclaimation":
        return <FontAwesomeIcon icon={faExclamationTriangle} color={"#ab003c"} style={styles.cardHeaderIcon}/>
      case "hourglass":
        return <FontAwesomeIcon icon={faHourglassHalf} color={"#2196f3"} style={styles.cardHeaderIcon}/>
      default:
        return undefined;
    }
  }

  public render = (): ReactNode => {
    const list = this.props.args.list;
    const items = [];

    for (let item of list) {
      let style = {...styles.card};
      if (this.state.visibleItem === item.id) {
        Object.assign(style, styles.highlightCard);
      }

      items.push(
        <div key={item.id} style={style}
             onClick={this.clickCard(item.id)}>
          {this.getIcon(item.icon)}
          <span style={styles.cardHeaderId}>{item.id}</span>
          <span style={styles.cardHeaderContent}>{item.name}</span>
        </div>
      );

      if (this.state.visibleItem === item.id) {
        items.push(
          <div key={"content"} style={styles.cardContent}
               dangerouslySetInnerHTML={{__html: item.value}}>
          </div>
        )
      }
    }

    return <div style={{paddingBottom: 4}}>
      {items}
    </div>;
  }

  //   this.setState(
  //     prevState => ({ numClicks: prevState.numClicks + 1 }),
  //     () => Streamlit.setComponentValue(this.state.numClicks)
  //   )
  // }
}

// "withStreamlitConnection" is a wrapper function. It bootstraps the
// connection between your component and the Streamlit app, and handles
// passing arguments from Python -> Component.
export default withStreamlitConnection(ToggleList);
